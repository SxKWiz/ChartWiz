/**
 * @fileOverview Binance API Service for Cryptocurrency Price Data
 * Provides real-time price information and market data for cryptocurrencies
 */

export interface CryptoPrice {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  high24h: string;
  low24h: string;
  volume: string;
  quoteVolume: string;
  lastUpdated: number;
}

export interface MarketData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  price: string;
  volume24h: string;
  priceChange24h: string;
  priceChangePercent24h: string;
}

class BinanceAPIService {
  private baseUrl = 'https://api.binance.com/api/v3';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTimeout = 30000; // 30 seconds

  /**
   * Get current price for a specific symbol
   */
  async getPrice(symbol: string): Promise<CryptoPrice> {
    const cacheKey = `price_${symbol.toUpperCase()}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=${symbol.toUpperCase()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price for ${symbol}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const priceData: CryptoPrice = {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice).toFixed(8),
        priceChange: parseFloat(data.priceChange).toFixed(8),
        priceChangePercent: parseFloat(data.priceChangePercent).toFixed(2),
        high24h: parseFloat(data.highPrice).toFixed(8),
        low24h: parseFloat(data.lowPrice).toFixed(8),
        volume: parseFloat(data.volume).toFixed(2),
        quoteVolume: parseFloat(data.quoteVolume).toFixed(2),
        lastUpdated: Date.now()
      };

      this.setCachedData(cacheKey, priceData);
      return priceData;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw new Error(`Unable to fetch price for ${symbol}. Please try again.`);
    }
  }

  /**
   * Get prices for multiple symbols
   */
  async getPrices(symbols: string[]): Promise<CryptoPrice[]> {
    const promises = symbols.map(symbol => this.getPrice(symbol));
    return Promise.allSettled(promises).then(results => 
      results
        .filter((result): result is PromiseFulfilledResult<CryptoPrice> => result.status === 'fulfilled')
        .map(result => result.value)
    );
  }

  /**
   * Get all USDT trading pairs
   */
  async getUSDTMarkets(): Promise<MarketData[]> {
    const cacheKey = 'usdt_markets';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}/ticker/24hr`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch markets: ${response.statusText}`);
      }

      const data = await response.json();
      
      const usdtMarkets = data
        .filter((item: any) => item.symbol.endsWith('USDT') && item.status === 'TRADING')
        .map((item: any): MarketData => ({
          symbol: item.symbol,
          baseAsset: item.symbol.replace('USDT', ''),
          quoteAsset: 'USDT',
          status: item.status,
          price: parseFloat(item.lastPrice).toFixed(8),
          volume24h: parseFloat(item.volume).toFixed(2),
          priceChange24h: parseFloat(item.priceChange).toFixed(8),
          priceChangePercent24h: parseFloat(item.priceChangePercent).toFixed(2)
        }))
        .sort((a: MarketData, b: MarketData) => parseFloat(b.volume24h) - parseFloat(a.volume24h));

      this.setCachedData(cacheKey, usdtMarkets);
      return usdtMarkets;
    } catch (error) {
      console.error('Error fetching USDT markets:', error);
      throw new Error('Unable to fetch market data. Please try again.');
    }
  }

  /**
   * Search for symbols by name or symbol
   */
  async searchSymbols(query: string): Promise<MarketData[]> {
    const markets = await this.getUSDTMarkets();
    const searchTerm = query.toLowerCase();
    
    return markets.filter(market => 
      market.symbol.toLowerCase().includes(searchTerm) ||
      market.baseAsset.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to top 10 results
  }

  /**
   * Get top gainers and losers
   */
  async getTopMovers(): Promise<{ gainers: MarketData[]; losers: MarketData[] }> {
    const markets = await this.getUSDTMarkets();
    
    const gainers = markets
      .filter(market => parseFloat(market.priceChangePercent24h) > 0)
      .sort((a, b) => parseFloat(b.priceChangePercent24h) - parseFloat(a.priceChangePercent24h))
      .slice(0, 5);

    const losers = markets
      .filter(market => parseFloat(market.priceChangePercent24h) < 0)
      .sort((a, b) => parseFloat(a.priceChangePercent24h) - parseFloat(b.priceChangePercent24h))
      .slice(0, 5);

    return { gainers, losers };
  }

  /**
   * Format price for display
   */
  formatPrice(price: string, symbol: string): string {
    const numPrice = parseFloat(price);
    
    if (numPrice >= 1) {
      return `$${numPrice.toFixed(2)}`;
    } else if (numPrice >= 0.01) {
      return `$${numPrice.toFixed(4)}`;
    } else {
      return `$${numPrice.toFixed(8)}`;
    }
  }

  /**
   * Format percentage change with color
   */
  formatPercentageChange(change: string): { text: string; isPositive: boolean } {
    const numChange = parseFloat(change);
    const isPositive = numChange >= 0;
    const sign = isPositive ? '+' : '';
    
    return {
      text: `${sign}${numChange.toFixed(2)}%`,
      isPositive
    };
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const binanceAPI = new BinanceAPIService();