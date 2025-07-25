/**
 * @fileOverview Data Provider Configuration
 * 
 * Configuration for real-time data providers including API keys,
 * connection settings, and fallback options.
 */

export interface ExchangeConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  testnet?: boolean;
  websocketUrl: string;
  restApiUrl: string;
  rateLimits: {
    requests: number;
    window: number; // milliseconds
  };
  reconnect: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
}

export interface DataProviderConfig {
  exchanges: { [exchangeName: string]: ExchangeConfig };
  defaultSymbols: string[];
  defaultTimeframes: string[];
  caching: {
    enabled: boolean;
    ttl: number; // milliseconds
    maxSize: number;
  };
  fallback: {
    enabled: boolean;
    sources: string[];
  };
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      connectionLoss: number; // seconds
      dataStale: number; // seconds
      errorRate: number; // percentage
    };
  };
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): DataProviderConfig {
  return {
    exchanges: {
      binance: {
        name: 'Binance',
        enabled: process.env.BINANCE_ENABLED !== 'false',
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_API_SECRET,
        testnet: process.env.BINANCE_TESTNET === 'true',
        websocketUrl: process.env.BINANCE_TESTNET === 'true' 
          ? 'wss://testnet.binance.vision/ws'
          : 'wss://stream.binance.com:9443/ws',
        restApiUrl: process.env.BINANCE_TESTNET === 'true'
          ? 'https://testnet.binance.vision/api'
          : 'https://api.binance.com/api',
        rateLimits: {
          requests: parseInt(process.env.BINANCE_RATE_LIMIT || '1200'),
          window: 60000 // 1 minute
        },
        reconnect: {
          maxAttempts: parseInt(process.env.BINANCE_MAX_RECONNECTS || '5'),
          backoffMultiplier: 2,
          maxDelay: 30000 // 30 seconds
        }
      },
      coinbase: {
        name: 'Coinbase Pro',
        enabled: process.env.COINBASE_ENABLED === 'true',
        apiKey: process.env.COINBASE_API_KEY,
        apiSecret: process.env.COINBASE_API_SECRET,
        websocketUrl: process.env.COINBASE_TESTNET === 'true'
          ? 'wss://ws-feed-public.sandbox.pro.coinbase.com'
          : 'wss://ws-feed.pro.coinbase.com',
        restApiUrl: process.env.COINBASE_TESTNET === 'true'
          ? 'https://api-public.sandbox.pro.coinbase.com'
          : 'https://api.pro.coinbase.com',
        rateLimits: {
          requests: parseInt(process.env.COINBASE_RATE_LIMIT || '100'),
          window: 60000
        },
        reconnect: {
          maxAttempts: 5,
          backoffMultiplier: 2,
          maxDelay: 30000
        }
      },
      kraken: {
        name: 'Kraken',
        enabled: process.env.KRAKEN_ENABLED === 'true',
        apiKey: process.env.KRAKEN_API_KEY,
        apiSecret: process.env.KRAKEN_API_SECRET,
        websocketUrl: 'wss://ws.kraken.com',
        restApiUrl: 'https://api.kraken.com',
        rateLimits: {
          requests: parseInt(process.env.KRAKEN_RATE_LIMIT || '60'),
          window: 60000
        },
        reconnect: {
          maxAttempts: 5,
          backoffMultiplier: 2,
          maxDelay: 30000
        }
      }
    },
    defaultSymbols: (process.env.DEFAULT_SYMBOLS || 'BTCUSDT,ETHUSDT,BNBUSDT').split(','),
    defaultTimeframes: (process.env.DEFAULT_TIMEFRAMES || '1m,5m,15m,1h,4h,1d').split(','),
    caching: {
      enabled: process.env.CACHING_ENABLED !== 'false',
      ttl: parseInt(process.env.CACHE_TTL || '300000'), // 5 minutes
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000')
    },
    fallback: {
      enabled: process.env.FALLBACK_ENABLED !== 'false',
      sources: (process.env.FALLBACK_SOURCES || 'generated,cached').split(',')
    },
    monitoring: {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      alertThresholds: {
        connectionLoss: parseInt(process.env.ALERT_CONNECTION_LOSS || '30'),
        dataStale: parseInt(process.env.ALERT_DATA_STALE || '60'),
        errorRate: parseInt(process.env.ALERT_ERROR_RATE || '10')
      }
    }
  };
}

/**
 * Validate configuration
 */
function validateConfig(config: DataProviderConfig): string[] {
  const errors: string[] = [];
  
  // Check if at least one exchange is enabled
  const enabledExchanges = Object.values(config.exchanges).filter(ex => ex.enabled);
  if (enabledExchanges.length === 0) {
    errors.push('No exchanges enabled - at least one exchange must be enabled');
  }
  
  // Validate symbols format
  config.defaultSymbols.forEach(symbol => {
    if (!/^[A-Z]{3,}USDT?$/.test(symbol)) {
      errors.push(`Invalid symbol format: ${symbol}`);
    }
  });
  
  // Validate timeframes
  const validTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
  config.defaultTimeframes.forEach(tf => {
    if (!validTimeframes.includes(tf)) {
      errors.push(`Invalid timeframe: ${tf}`);
    }
  });
  
  // Check API keys for enabled exchanges
  Object.entries(config.exchanges).forEach(([name, exchange]) => {
    if (exchange.enabled && !exchange.apiKey && name !== 'binance') {
      // Binance allows public data without API key
      console.warn(`${name} is enabled but no API key provided - only public data will be available`);
    }
  });
  
  return errors;
}

/**
 * Get the current configuration
 */
export function getDataProviderConfig(): DataProviderConfig {
  const config = loadConfigFromEnv();
  
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    throw new Error(`Invalid configuration: ${errors.join(', ')}`);
  }
  
  return config;
}

/**
 * Get configuration for a specific exchange
 */
export function getExchangeConfig(exchangeName: string): ExchangeConfig | null {
  const config = getDataProviderConfig();
  return config.exchanges[exchangeName] || null;
}

/**
 * Check if real-time data is properly configured
 */
export function isRealTimeDataConfigured(): boolean {
  try {
    const config = getDataProviderConfig();
    const enabledExchanges = Object.values(config.exchanges).filter(ex => ex.enabled);
    return enabledExchanges.length > 0;
  } catch (error) {
    console.error('Error checking real-time data configuration:', error);
    return false;
  }
}

/**
 * Get list of configured symbols for all enabled exchanges
 */
export function getConfiguredSymbols(): string[] {
  const config = getDataProviderConfig();
  return config.defaultSymbols;
}

/**
 * Get list of configured timeframes
 */
export function getConfiguredTimeframes(): string[] {
  const config = getDataProviderConfig();
  return config.defaultTimeframes;
}

/**
 * Development/testing configuration
 */
export function getDevelopmentConfig(): DataProviderConfig {
  return {
    exchanges: {
      binance: {
        name: 'Binance Testnet',
        enabled: true,
        testnet: true,
        websocketUrl: 'wss://testnet.binance.vision/ws',
        restApiUrl: 'https://testnet.binance.vision/api',
        rateLimits: {
          requests: 1200,
          window: 60000
        },
        reconnect: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          maxDelay: 10000
        }
      }
    },
    defaultSymbols: ['BTCUSDT', 'ETHUSDT'],
    defaultTimeframes: ['1m', '5m', '1h', '4h'],
    caching: {
      enabled: true,
      ttl: 60000, // 1 minute for development
      maxSize: 100
    },
    fallback: {
      enabled: true,
      sources: ['generated']
    },
    monitoring: {
      enabled: false, // Disable monitoring in development
      alertThresholds: {
        connectionLoss: 60,
        dataStale: 120,
        errorRate: 20
      }
    }
  };
}

// Export the default configuration
export const dataProviderConfig = getDataProviderConfig();

// Example .env file content (for documentation)
export const EXAMPLE_ENV_CONFIG = `
# Data Provider Configuration

# Binance Configuration
BINANCE_ENABLED=true
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_secret_here
BINANCE_TESTNET=false
BINANCE_RATE_LIMIT=1200
BINANCE_MAX_RECONNECTS=5

# Coinbase Pro Configuration
COINBASE_ENABLED=false
COINBASE_API_KEY=your_coinbase_key_here
COINBASE_API_SECRET=your_coinbase_secret_here
COINBASE_TESTNET=false
COINBASE_RATE_LIMIT=100

# Kraken Configuration
KRAKEN_ENABLED=false
KRAKEN_API_KEY=your_kraken_key_here
KRAKEN_API_SECRET=your_kraken_secret_here
KRAKEN_RATE_LIMIT=60

# Default Configuration
DEFAULT_SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT,ADAUSDT,SOLUSDT
DEFAULT_TIMEFRAMES=1m,5m,15m,1h,4h,1d

# Caching Configuration
CACHING_ENABLED=true
CACHE_TTL=300000
CACHE_MAX_SIZE=1000

# Fallback Configuration
FALLBACK_ENABLED=true
FALLBACK_SOURCES=generated,cached

# Monitoring Configuration
MONITORING_ENABLED=true
ALERT_CONNECTION_LOSS=30
ALERT_DATA_STALE=60
ALERT_ERROR_RATE=10
`;