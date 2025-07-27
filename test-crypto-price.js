// Test crypto price functionality
const { binanceAPI } = require('./src/lib/binance-api.ts');

async function testCryptoPrice() {
  try {
    console.log('🔍 Testing crypto price functionality...');
    
    // Test getting BTC price
    console.log('\n📊 Testing BTC price fetch...');
    const btcPrice = await binanceAPI.getPrice('BTCUSDT');
    console.log('BTC Price:', btcPrice);
    
    // Test getting multiple prices
    console.log('\n📊 Testing multiple price fetch...');
    const prices = await binanceAPI.getPrices(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']);
    console.log('Multiple Prices:', prices);
    
    // Test top movers
    console.log('\n🔥 Testing top movers...');
    const movers = await binanceAPI.getTopMovers();
    console.log('Top Gainers:', movers.gainers.slice(0, 3));
    console.log('Top Losers:', movers.losers.slice(0, 3));
    
    console.log('\n✅ Crypto price functionality test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCryptoPrice();