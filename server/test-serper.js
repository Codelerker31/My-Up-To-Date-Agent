require('dotenv').config();
const axios = require('axios');

async function testSerperAPI() {
  const apiKey = process.env.WEB_SEARCH_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No WEB_SEARCH_API_KEY found in environment variables');
    console.log('Please add your Serper API key to your .env file');
    return;
  }

  console.log('🔍 Testing Serper API...');
  
  try {
    const requestBody = {
      q: 'artificial intelligence latest news',
      num: 5,
      gl: 'us',
      hl: 'en'
    };

    const response = await axios.post('https://google.serper.dev/search', requestBody, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Serper API is working!');
    
    if (response.data.organic && response.data.organic.length > 0) {
      console.log(`📊 Found ${response.data.organic.length} organic results`);
      
      console.log('\n📰 Sample organic results:');
      response.data.organic.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   URL: ${result.link}`);
        console.log(`   Source: ${result.displayLink}`);
        console.log('');
      });
    }

    if (response.data.news && response.data.news.length > 0) {
      console.log(`📰 Found ${response.data.news.length} news results`);
      
      console.log('\n📰 Sample news results:');
      response.data.news.slice(0, 2).forEach((news, index) => {
        console.log(`${index + 1}. ${news.title}`);
        console.log(`   URL: ${news.link}`);
        console.log(`   Source: ${news.source}`);
        console.log('');
      });
    }

  } catch (error) {
    console.log('❌ Error testing Serper API:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testSerperAPI(); 