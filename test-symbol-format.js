// Test symbol formatting
const { binanceAPI } = require('./src/lib/binance-api.ts');

function testSymbolFormatting() {
  console.log('🔍 Testing symbol formatting...');
  
  const testSymbols = ['BTC', 'ETH', 'btc', 'eth', 'BTCUSDT', 'ETHUSDT', 'bitcoin', 'ethereum'];
  
  testSymbols.forEach(symbol => {
    const formatted = binanceAPI.formatSymbol(symbol);
    console.log(`${symbol} -> ${formatted}`);
  });
  
  console.log('\n✅ Symbol formatting test completed!');
}

testSymbolFormatting();