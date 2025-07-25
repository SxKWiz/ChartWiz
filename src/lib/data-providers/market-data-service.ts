/**
 * @fileOverview Market Data Service
 * 
 * This service provides a unified interface for accessing market data
 * from various sources including real-time feeds, APIs, and fallback data.
 */

import { realTimeDataProvider, initializeRealTimeData, type PriceUpdate, type OrderBookUpdate, type TradeUpdate } from './real-time-data-provider';

export interface MarketDataRequest {
  symbol: string;
  timeframe: string;
  limit?: number;
  exchange?: string;
  includeOrderBook?: boolean;
  includeTrades?: boolean;
}

export interface MarketDataResponse {
  symbol: string;
  timeframe: string;
  exchange: string;
  timestamp: number;
  
  // Historical data
  prices: number[];
  volumes: number[];
  timestamps: number[];
  currentPrice: number;
  
  // Real-time data (optional)
  orderBook?: {
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
    timestamp: number;
  };
  
  trades?: Array<{
    price: number;
    size: number;
    side: 'buy' | 'sell';
    timestamp: number;
  }>;
  
  // Data quality indicators
  dataQuality: {
    isRealTime: boolean;
    lastUpdate: number;
    source: 'real-time' | 'api' | 'fallback';
    confidence: number; // 0-100
  };
}

export class MarketDataService {
  private initialized: boolean = false;
  private fallbackCache: Map<string, MarketDataResponse> = new Map();
  
  /**
   * Initialize the market data service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await initializeRealTimeData();
      this.initialized = true;
      console.log('Market Data Service initialized with real-time data');
    } catch (error) {
      console.warn('Failed to initialize real-time data, using fallback mode:', error);
      this.initialized = true; // Still mark as initialized for fallback mode
    }
  }
  
  /**
   * Get comprehensive market data
   */
  async getMarketData(request: MarketDataRequest): Promise<MarketDataResponse> {
    await this.initialize();
    
    const {
      symbol,
      timeframe,
      limit = 100,
      exchange = 'binance',
      includeOrderBook = false,
      includeTrades = false
    } = request;
    
    try {
      // Try to get real-time data first
      const historicalData = await realTimeDataProvider.getHistoricalData(
        symbol,
        timeframe,
        limit,
        exchange
      );
      
      let orderBook;
      let trades;
      
      if (includeOrderBook) {
        const orderBookData = await realTimeDataProvider.getOrderBook(symbol, exchange);
        if (orderBookData) {
          orderBook = {
            bids: orderBookData.bids,
            asks: orderBookData.asks,
            timestamp: orderBookData.timestamp
          };
        }
      }
      
      if (includeTrades) {
        const tradeData = await realTimeDataProvider.getRecentTrades(symbol, exchange);
        if (tradeData && tradeData.length > 0) {
          trades = tradeData.map(trade => ({
            price: trade.price,
            size: trade.size,
            side: trade.side,
            timestamp: trade.timestamp
          }));
        }
      }
      
      const response: MarketDataResponse = {
        symbol,
        timeframe,
        exchange,
        timestamp: Date.now(),
        prices: historicalData.prices,
        volumes: historicalData.volumes,
        timestamps: historicalData.timestamps,
        currentPrice: historicalData.prices[historicalData.prices.length - 1],
        orderBook,
        trades,
        dataQuality: {
          isRealTime: true,
          lastUpdate: Date.now(),
          source: 'real-time',
          confidence: 95
        }
      };
      
      // Cache the response
      this.cacheResponse(request, response);
      
      return response;
    } catch (error) {
      console.warn('Failed to get real-time data, using fallback:', error);
      return this.getFallbackData(request);
    }
  }
  
  /**
   * Get market data for multiple symbols
   */
  async getMultipleMarketData(requests: MarketDataRequest[]): Promise<MarketDataResponse[]> {
    const promises = requests.map(request => this.getMarketData(request));
    return Promise.all(promises);
  }
  
  /**
   * Subscribe to real-time price updates
   */
  subscribeToPrice(symbol: string, callback: (update: PriceUpdate) => void): () => void {
    const handler = (update: PriceUpdate) => {
      if (update.symbol === symbol) {
        callback(update);
      }
    };
    
    realTimeDataProvider.on('priceUpdate', handler);
    
    // Return unsubscribe function
    return () => {
      realTimeDataProvider.off('priceUpdate', handler);
    };
  }
  
  /**
   * Subscribe to real-time order book updates
   */
  subscribeToOrderBook(symbol: string, callback: (update: OrderBookUpdate) => void): () => void {
    const handler = (update: OrderBookUpdate) => {
      if (update.symbol === symbol) {
        callback(update);
      }
    };
    
    realTimeDataProvider.on('orderBookUpdate', handler);
    
    return () => {
      realTimeDataProvider.off('orderBookUpdate', handler);
    };
  }
  
  /**
   * Subscribe to real-time trade updates
   */
  subscribeToTrades(symbol: string, callback: (update: TradeUpdate) => void): () => void {
    const handler = (update: TradeUpdate) => {
      if (update.symbol === symbol) {
        callback(update);
      }
    };
    
    realTimeDataProvider.on('tradeUpdate', handler);
    
    return () => {
      realTimeDataProvider.off('tradeUpdate', handler);
    };
  }
  
  /**
   * Get data quality status
   */
  getDataQualityStatus(): {
    isConnected: boolean;
    lastUpdate: number;
    exchanges: string[];
    activeSymbols: string[];
  } {
    const snapshot = realTimeDataProvider.getSnapshot();
    
    return {
      isConnected: this.initialized,
      lastUpdate: snapshot.timestamp,
      exchanges: ['binance'], // Would be dynamic based on active connections
      activeSymbols: Array.from(snapshot.prices.keys()).map(key => key.split(':')[1])
    };
  }
  
  /**
   * Force refresh of market data
   */
  async refreshMarketData(symbol: string, timeframe: string): Promise<MarketDataResponse> {
    // Clear cache for this symbol/timeframe
    const cacheKey = `${symbol}:${timeframe}`;
    this.fallbackCache.delete(cacheKey);
    
    // Fetch fresh data
    return this.getMarketData({ symbol, timeframe });
  }
  
  /**
   * Get fallback data when real-time is unavailable
   */
  private getFallbackData(request: MarketDataRequest): MarketDataResponse {
    const cacheKey = `${request.symbol}:${request.timeframe}`;
    
    // Check cache first
    const cached = this.fallbackCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
      return cached;
    }
    
    // Generate fallback data
    const { symbol, timeframe, limit = 100, exchange = 'binance' } = request;
    
    const { prices, volumes, timestamps } = this.generateFallbackMarketData(symbol, limit);
    
    const response: MarketDataResponse = {
      symbol,
      timeframe,
      exchange,
      timestamp: Date.now(),
      prices,
      volumes,
      timestamps,
      currentPrice: prices[prices.length - 1],
      dataQuality: {
        isRealTime: false,
        lastUpdate: Date.now(),
        source: 'fallback',
        confidence: 60 // Lower confidence for generated data
      }
    };
    
    this.cacheResponse(request, response);
    return response;
  }
  
  /**
   * Generate realistic fallback market data
   */
  private generateFallbackMarketData(symbol: string, limit: number): {
    prices: number[];
    volumes: number[];
    timestamps: number[];
  } {
    const prices: number[] = [];
    const volumes: number[] = [];
    const timestamps: number[] = [];
    
    // Determine base price based on symbol
    let currentPrice = this.getBasePriceForSymbol(symbol);
    
    const now = Date.now();
    const interval = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    
    for (let i = 0; i < limit; i++) {
      // Generate realistic price movement
      const volatility = currentPrice * 0.015; // 1.5% volatility
      const trend = Math.sin(i * 0.1) * 0.001; // Slight trend component
      const noise = (Math.random() - 0.5) * volatility;
      
      currentPrice = Math.max(currentPrice * 0.01, currentPrice + (currentPrice * trend) + noise);
      
      // Generate realistic volume
      const baseVolume = this.getBaseVolumeForSymbol(symbol);
      const volumeVariation = 0.5 + Math.random(); // 50-150% of base volume
      const volume = baseVolume * volumeVariation;
      
      prices.push(currentPrice);
      volumes.push(volume);
      timestamps.push(now - (limit - 1 - i) * interval);
    }
    
    return { prices, volumes, timestamps };
  }
  
  /**
   * Get base price for different symbols
   */
  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'BNBUSDT': 300,
      'ADAUSDT': 0.5,
      'SOLUSDT': 100,
      'DOTUSDT': 7,
      'LINKUSDT': 15,
      'AVAXUSDT': 25,
      'MATICUSDT': 1,
      'ATOMUSDT': 12
    };
    
    return basePrices[symbol] || 1;
  }
  
  /**
   * Get base volume for different symbols
   */
  private getBaseVolumeForSymbol(symbol: string): number {
    const baseVolumes: { [key: string]: number } = {
      'BTCUSDT': 50000000,
      'ETHUSDT': 30000000,
      'BNBUSDT': 10000000,
      'ADAUSDT': 5000000,
      'SOLUSDT': 8000000,
      'DOTUSDT': 3000000,
      'LINKUSDT': 4000000,
      'AVAXUSDT': 6000000,
      'MATICUSDT': 2000000,
      'ATOMUSDT': 3000000
    };
    
    return baseVolumes[symbol] || 1000000;
  }
  
  /**
   * Cache response for fallback
   */
  private cacheResponse(request: MarketDataRequest, response: MarketDataResponse): void {
    const cacheKey = `${request.symbol}:${request.timeframe}`;
    this.fallbackCache.set(cacheKey, response);
    
    // Limit cache size
    if (this.fallbackCache.size > 100) {
      const firstKey = this.fallbackCache.keys().next().value;
      this.fallbackCache.delete(firstKey);
    }
  }
  
  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    try {
      await realTimeDataProvider.disconnect();
      this.initialized = false;
      console.log('Market Data Service shut down');
    } catch (error) {
      console.error('Error shutting down Market Data Service:', error);
    }
  }
}

// Create singleton instance
export const marketDataService = new MarketDataService();

// Convenience functions for easy access
export async function getMarketData(symbol: string, timeframe: string = '4h', limit: number = 100): Promise<MarketDataResponse> {
  return marketDataService.getMarketData({ symbol, timeframe, limit });
}

export async function getMarketDataWithOrderBook(symbol: string, timeframe: string = '4h'): Promise<MarketDataResponse> {
  return marketDataService.getMarketData({ 
    symbol, 
    timeframe, 
    includeOrderBook: true, 
    includeTrades: true 
  });
}

export function subscribeToRealTimePrice(symbol: string, callback: (price: number) => void): () => void {
  return marketDataService.subscribeToPrice(symbol, (update) => {
    callback(update.price);
  });
}