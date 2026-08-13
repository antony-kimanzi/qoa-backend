import axios from 'axios';
import https from 'https';
import * as dotenv from 'dotenv';
import { config } from 'dotenv';

// Load environment variables
dotenv.config();

async function testMpesaIntegration() {
  console.log('🧪 Testing M-Pesa Integration...\n');

  const config = {
    baseURL: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortCode: process.env.STK_SHORTCODE || '174379',
    passKey:
      process.env.PASS_KEY ||
      'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    callbackUrl: process.env.STK_CALLBACK_URL,
    phoneNumber: process.env.TEST_PHONE_NUMBER || '254798974760',
  };

  console.log('📋 Configuration:');
  console.log(
    `  Consumer Key: ${config.consumerKey ? '✅ Set' : '❌ Missing'}`,
  );
  console.log(
    `  Consumer Secret: ${config.consumerSecret ? '✅ Set' : '❌ Missing'}`,
  );
  console.log(`  Short Code: ${config.shortCode}`);
  console.log(`  Test Phone: ${config.phoneNumber}\n`);

  if (!config.consumerKey || !config.consumerSecret) {
    console.error('❌ Missing credentials. Please check .env file.');
    return;
  }

  try {
    // Step 1: Generate Access Token
    console.log('🔑 Step 1: Generating Access Token...');
    const auth = Buffer.from(
      `${config.consumerKey}:${config.consumerSecret}`,
    ).toString('base64');

    const tokenResponse = await axios.get(
      `${config.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${auth}` },
        timeout: 30000,
      },
    );

    const accessToken = tokenResponse.data.access_token;
    console.log(
      `✅ Access Token generated: ${accessToken.substring(0, 20)}...\n`,
    );

    // Step 2: STK Push with longer timeout and retries
    console.log('💳 Step 2: Initiating STK Push...');

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);

    const password = Buffer.from(
      `${config.shortCode}${config.passKey}${timestamp}`,
    ).toString('base64');

    const requestData = {
      BusinessShortCode: config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1,
      PartyA: config.phoneNumber,
      PartyB: config.shortCode,
      PhoneNumber: config.phoneNumber,
      CallBackURL:
        config.callbackUrl || 'https://your-ngrok-url/api/v1/payment/callback',
      AccountReference: `TEST-${Date.now()}`,
      TransactionDesc: 'Test Payment',
    };

    console.log('📤 Sending STK Push request...');
    console.log(`  Amount: ${requestData.Amount} KES`);
    console.log(`  Phone: ${requestData.PhoneNumber}\n`);

    // Try with different timeout values
    const timeouts = [60000, 90000, 120000];
    let lastError: any;

    for (let attempt = 0; attempt < timeouts.length; attempt++) {
      try {
        console.log(
          `  Attempt ${attempt + 1} with ${timeouts[attempt] / 1000}s timeout...`,
        );

        const response = await axios.post(
          `${config.baseURL}/mpesa/stkpush/v1/processrequest`,
          requestData,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: timeouts[attempt],
            httpsAgent: new https.Agent({
              rejectUnauthorized: false,
              keepAlive: true,
            }),
          },
        );

        console.log('\n📥 STK Push Response:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.ResponseCode === '0') {
          console.log('\n✅ STK Push successful!');
          console.log(
            `📱 Checkout Request ID: ${response.data.CheckoutRequestID}`,
          );
          console.log(`💬 ${response.data.ResponseDescription}`);
          console.log('\n📱 Check your phone for the M-Pesa prompt.');
          return;
        } else {
          console.log(
            `\n❌ STK Push failed: ${response.data.ResponseDescription}`,
          );
          return;
        }
      } catch (error: any) {
        lastError = error;
        if (error.code === 'ECONNABORTED') {
          console.log(
            `  ⏱️ Timeout with ${timeouts[attempt] / 1000}s, trying longer timeout...`,
          );
          continue;
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error('\n❌ Error occurred:');

    if (error.code === 'ECONNABORTED') {
      console.error(
        '  All attempts timed out. The Safaricom sandbox might be slow.',
      );
      console.error('  Try these solutions:');
      console.error('  1. Use a different network (mobile hotspot)');
      console.error('  2. Try during off-peak hours');
      console.error('  3. Use the production API (if you have credentials)');
    } else if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  No response received. Network issue.');
    } else {
      console.error(`  ${error.message}`);
    }
  }
}

testMpesaIntegration();
