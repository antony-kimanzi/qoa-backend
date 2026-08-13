import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

async function testNgrokUrl() {
  const callbackUrl = process.env.STK_CALLBACK_URL;

  console.log('🔍 Testing ngrok URL...\n');
  console.log(`URL: ${callbackUrl}`);

  if (!callbackUrl) {
    console.error('❌ STK_CALLBACK_URL not set in .env');
    return;
  }

  try {
    const response = await axios.get(callbackUrl, {
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    console.log(`✅ URL is accessible`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
  } catch (error: any) {
    if (error.code === 'ENOTFOUND') {
      console.error('❌ Domain not found. Is ngrok running?');
      console.error('   Run: ngrok http 3001');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is your app running?');
      console.error('   Run: npm run start:dev');
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

testNgrokUrl();
