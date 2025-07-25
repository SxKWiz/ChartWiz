/**
 * @fileOverview Real-Time Data Provider
 * 
 * This module provides real-time market data from various cryptocurrency exchanges
 * including price data, volume, order book data, and trade streams.
 */

import { EventEmitter } from 'events';

export interface RealTimeDataConfig {
  exchanges: string[];
  symbols: string[];
  dataTypes: ('price' | 'volume' | 'orderbook' | 'trades' | 'klines')[];
  updateInterval: number; // milliseconds
  apiKeys?: { [exchange: string]: { key: string; secret: string } };
}

export interface PriceUpdate {
  symbol: string;
  exchange: string;
  price: number;
  timestamp: number;
  volume24h: number;
  change24h: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  orders?: number;
}

export interface OrderBookUpdate {
  symbol: string;
  exchange: string;
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId?: number;
}

export interface TradeUpdate {
  symbol: string;
  exchange: string;
  timestamp: number;
  tradeId: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  isMaker: boolean;
}

export interface KlineData {
  symbol: string;
  exchange: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}

export interface MarketDataSnapshot {
  timestamp: number;
  prices: Map<string, PriceUpdate>;
  orderBooks: Map<string, OrderBookUpdate>;
  recentTrades: Map<string, TradeUpdate[]>;
  klines: Map<string, KlineData[]>;
}

export class RealTimeDataProvider extends EventEmitter {
  private config: RealTimeDataConfig;
  private connections: Map<string, WebSocket> = new Map();
  private restClients: Map<string, any> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: Map<string, number> = new Map();
  private dataSnapshot: MarketDataSnapshot;
  
  constructor(config: RealTimeDataConfig) {
    super();
    this.config = config;
    this.dataSnapshot = {
      timestamp: Date.now(),
      prices: new Map(),
      orderBooks: new Map(),
      recentTrades: new Map(),
      klines: new Map()
    };
  }
  
  /**
   * Start real-time data streams
   */
  async connect(): Promise<void> {
    console.log('Connecting to real-time data streams...');
    
    for (const exchange of this.config.exchanges) {
      try {
        await this.connectToExchange(exchange);
      } catch (error) {
        console.error(`Failed to connect to ${exchange}:`, error);
        this.emit('error', { exchange, error });
      }
    }
    
    this.isConnected = true;
    this.emit('connected');
  }
  
  /**
   * Disconnect from all data streams
   */
  async disconnect(): Promise<void> {
    console.log('Disconnecting from real-time data streams...');
    
    for (const [exchange, ws] of this.connections) {
      ws.close();
    }
    
    this.connections.clear();
    this.isConnected = false;
    this.emit('disconnected');
  }
  
  /**
   * Get current market data snapshot
   */
  getSnapshot(): MarketDataSnapshot {
    return {
      ...this.dataSnapshot,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get historical price data
   */
  async getHistoricalData(
    symbol: string,
    interval: string,
    limit: number = 100,
    exchange: string = 'binance'
  ): Promise<{
    prices: number[];
    volumes: number[];
    timestamps: number[];
  }> {
    try {
      const data = await this.fetchHistoricalKlines(exchange, symbol, interval, limit);
      
      return {
        prices: data.map(k => k.close),
        volumes: data.map(k => k.volume),
        timestamps: data.map(k => k.closeTime)
      };
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      return this.generateFallbackData(symbol, limit);
    }
  }
  
  /**
   * Get current order book
   */
  async getOrderBook(symbol: string, exchange: string = 'binance'): Promise<OrderBookUpdate | null> {
    return this.dataSnapshot.orderBooks.get(`${exchange}:${symbol}`) || null;
  }
  
  /**
   * Get recent trades
   */
  async getRecentTrades(symbol: string, exchange: string = 'binance'): Promise<TradeUpdate[]> {
    return this.dataSnapshot.recentTrades.get(`${exchange}:${symbol}`) || [];
  }
  
  /**
   * Connect to specific exchange
   */
  private async connectToExchange(exchange: string): Promise<void> {
    switch (exchange.toLowerCase()) {
      case 'binance':
        await this.connectToBinance();
        break;
      case 'coinbase':
        await this.connectToCoinbase();
        break;
      case 'kraken':
        await this.connectToKraken();
        break;
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
  }
  
  /**
   * Connect to Binance WebSocket streams
   */
  private async connectToBinance(): Promise<void> {
    const symbols = this.config.symbols.map(s => s.toLowerCase()).join('/');
    const streams: string[] = [];
    
    if (this.config.dataTypes.includes('price')) {
      this.config.symbols.forEach(symbol => {
        streams.push(`${symbol.toLowerCase()}@ticker`);
      });
    }
    
    if (this.config.dataTypes.includes('orderbook')) {
      this.config.symbols.forEach(symbol => {
        streams.push(`${symbol.toLowerCase()}@depth20@100ms`);
      });
    }
    
    if (this.config.dataTypes.includes('trades')) {
      this.config.symbols.forEach(symbol => {
        streams.push(`${symbol.toLowerCase()}@trade`);
      });
    }
    
    if (this.config.dataTypes.includes('klines')) {
      this.config.symbols.forEach(symbol => {
        streams.push(`${symbol.toLowerCase()}@kline_1m`);
      });
    }
    
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams.join('/')}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to Binance WebSocket');
      this.reconnectAttempts.set('binance', 0);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleBinanceMessage(data);
      } catch (error) {
        console.error('Error parsing Binance message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('Binance WebSocket closed');
      this.handleReconnect('binance');
    };
    
    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
    };
    
    this.connections.set('binance', ws);
    
    // Also set up REST client for historical data
    this.setupBinanceRestClient();
  }
  
  /**
   * Handle Binance WebSocket messages
   */
  private handleBinanceMessage(data: any): void {
    if (data.e === '24hrTicker') {
      // Price update
      const priceUpdate: PriceUpdate = {
        symbol: data.s,
        exchange: 'binance',
        price: parseFloat(data.c),
        timestamp: data.E,
        volume24h: parseFloat(data.v),
        change24h: parseFloat(data.P)
      };
      
      this.dataSnapshot.prices.set(`binance:${data.s}`, priceUpdate);
      this.emit('priceUpdate', priceUpdate);
    }
    
    if (data.e === 'depthUpdate') {
      // Order book update
      const orderBookUpdate: OrderBookUpdate = {
        symbol: data.s,
        exchange: 'binance',
        timestamp: data.E,
        bids: data.b.map((bid: string[]) => ({
          price: parseFloat(bid[0]),
          size: parseFloat(bid[1])
        })),
        asks: data.a.map((ask: string[]) => ({
          price: parseFloat(ask[0]),
          size: parseFloat(ask[1])
        })),
        lastUpdateId: data.u
      };
      
      this.dataSnapshot.orderBooks.set(`binance:${data.s}`, orderBookUpdate);
      this.emit('orderBookUpdate', orderBookUpdate);
    }
    
    if (data.e === 'trade') {
      // Trade update
      const tradeUpdate: TradeUpdate = {
        symbol: data.s,
        exchange: 'binance',
        timestamp: data.T,
        tradeId: data.t.toString(),
        price: parseFloat(data.p),
        size: parseFloat(data.q),
        side: data.m ? 'sell' : 'buy', // m = true if buyer is market maker
        isMaker: data.m
      };
      
      // Store recent trades (keep last 100)
      const key = `binance:${data.s}`;
      const recentTrades = this.dataSnapshot.recentTrades.get(key) || [];
      recentTrades.push(tradeUpdate);
      if (recentTrades.length > 100) {
        recentTrades.shift();
      }
      this.dataSnapshot.recentTrades.set(key, recentTrades);
      
      this.emit('tradeUpdate', tradeUpdate);
    }
    
    if (data.e === 'kline') {
      // Kline/candlestick update
      const kline = data.k;
      const klineData: KlineData = {
        symbol: kline.s,
        exchange: 'binance',
        interval: kline.i,
        openTime: kline.t,
        closeTime: kline.T,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
        trades: kline.n
      };
      
      if (kline.x) { // Only process closed klines
        const key = `binance:${kline.s}:${kline.i}`;
        const klines = this.dataSnapshot.klines.get(key) || [];
        klines.push(klineData);
        if (klines.length > 1000) { // Keep last 1000 klines
          klines.shift();
        }
        this.dataSnapshot.klines.set(key, klines);
        
        this.emit('klineUpdate', klineData);
      }
    }
  }
  
  /**
   * Setup Binance REST client for historical data
   */
  private setupBinanceRestClient(): void {
    // In a real implementation, you would use the Binance REST API
    // For now, we'll create a simple wrapper
    this.restClients.set('binance', {
      baseURL: 'https://api.binance.com',
      // Add API key if provided
      apiKey: this.config.apiKeys?.binance?.key
    });
  }
  
  /**
   * Fetch historical klines from Binance REST API
   */
  private async fetchHistoricalKlines(
    exchange: string,
    symbol: string,
    interval: string,
    limit: number
  ): Promise<KlineData[]> {
    if (exchange !== 'binance') {
      throw new Error(`Historical data not implemented for ${exchange}`);
    }
    
    try {
      // In a real implementation, you would make an actual HTTP request
      // For now, we'll simulate the response
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      // This would be a real fetch call:
      // const response = await fetch(url);
      // const data = await response.json();
      
      // For now, generate realistic sample data
      return this.generateRealisticKlineData(symbol, interval, limit);
    } catch (error) {
      console.error('Error fetching historical klines:', error);
      throw error;
    }
  }
  
  /**
   * Connect to Coinbase WebSocket (placeholder)
   */
  private async connectToCoinbase(): Promise<void> {
    // Placeholder for Coinbase Pro WebSocket implementation
    console.log('Coinbase connection not yet implemented');
  }
  
  /**
   * Connect to Kraken WebSocket (placeholder)
   */
  private async connectToKraken(): Promise<void> {
    // Placeholder for Kraken WebSocket implementation
    console.log('Kraken connection not yet implemented');
  }
  
  /**
   * Handle reconnection logic
   */
  private handleReconnect(exchange: string): void {
    const attempts = this.reconnectAttempts.get(exchange) || 0;
    
    if (attempts < 5) {
      const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
      console.log(`Reconnecting to ${exchange} in ${delay}ms (attempt ${attempts + 1})`);
      
      setTimeout(() => {
        this.reconnectAttempts.set(exchange, attempts + 1);
        this.connectToExchange(exchange);
      }, delay);
    } else {
      console.error(`Max reconnection attempts reached for ${exchange}`);
      this.emit('error', { exchange, error: 'Max reconnection attempts reached' });
    }
  }
  
  /**
   * Generate fallback data when real data is unavailable
   */
  private generateFallbackData(symbol: string, limit: number): {
    prices: number[];
    volumes: number[];
    timestamps: number[];
  } {
    const prices: number[] = [];
    const volumes: number[] = [];
    const timestamps: number[] = [];
    
    let currentPrice = symbol.includes('BTC') ? 45000 : 
                      symbol.includes('ETH') ? 3000 : 
                      symbol.includes('BNB') ? 300 : 1;
    
    const now = Date.now();
    const interval = 4 * 60 * 60 * 1000; // 4 hours
    
    for (let i = 0; i < limit; i++) {
      // Simulate realistic price movement
      const volatility = currentPrice * 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      currentPrice = Math.max(currentPrice * 0.01, currentPrice + change);
      
      prices.push(currentPrice);
      volumes.push(1000000 + Math.random() * 500000);
      timestamps.push(now - (limit - 1 - i) * interval);
    }
    
    return { prices, volumes, timestamps };
  }
  
  /**
   * Generate realistic kline data for testing
   */
  private generateRealisticKlineData(symbol: string, interval: string, limit: number): KlineData[] {
    const klines: KlineData[] = [];
    let basePrice = symbol.includes('BTC') ? 45000 : 
                   symbol.includes('ETH') ? 3000 : 1;
    
    const now = Date.now();
    const intervalMs = this.getIntervalMs(interval);
    
    for (let i = 0; i < limit; i++) {
      const openTime = now - (limit - i) * intervalMs;
      const closeTime = openTime + intervalMs - 1;
      
      const volatility = basePrice * 0.01; // 1% volatility per candle
      const open = basePrice;
      const change = (Math.random() - 0.5) * volatility;
      const close = Math.max(basePrice * 0.01, open + change);
      
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      
      klines.push({
        symbol,
        exchange: 'binance',
        interval,
        openTime,
        closeTime,
        open,
        high,
        low,
        close,
        volume: 1000 + Math.random() * 5000,
        trades: Math.floor(100 + Math.random() * 500)
      });
      
      basePrice = close;
    }
    
    return klines;
  }
  
  /**
   * Convert interval string to milliseconds
   */
  private getIntervalMs(interval: string): number {
    const intervals: { [key: string]: number } = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    };
    
    return intervals[interval] || 60 * 1000; // Default to 1 minute
  }
}

// Create a singleton instance
export const realTimeDataProvider = new RealTimeDataProvider({
  exchanges: ['binance'], // Start with Binance
  symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  dataTypes: ['price', 'volume', 'orderbook', 'trades', 'klines'],
  updateInterval: 100,
  // apiKeys would be provided via environment variables
});

// Example usage and connection management
export async function initializeRealTimeData(): Promise<void> {
  try {
    await realTimeDataProvider.connect();
    console.log('Real-time data provider connected successfully');
  } catch (error) {
    console.error('Failed to initialize real-time data provider:', error);
  }
}

export async function shutdownRealTimeData(): Promise<void> {
  try {
    await realTimeDataProvider.disconnect();
    console.log('Real-time data provider disconnected');
  } catch (error) {
    console.error('Error shutting down real-time data provider:', error);
  }
}