// src/mpesa/mpesa-daraja.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import https from 'https';

@Injectable()
export class MpesaDarajaService implements OnModuleInit {
  private readonly logger = new Logger(MpesaDarajaService.name);
  private accessToken: string;
  private tokenExpiry = 0;
  private isConfigured = false;
  private baseURL = this.config.get<string>('MPESA_BASE_URL');
  private consumerKey = this.config.get<string>('MPESA_CONSUMER_KEY');
  private consumerSecret = this.config.get<string>('MPESA_CONSUMER_SECRET');
  private shortCode = this.config.get('STK_SHORTCODE');
  private passKey = this.config.get('PASS_KEY');
  private callbackUrl = this.config.get('STK_CALLBACK_URL');

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    // Check if M-Pesa is configured

    if (!this.baseURL || !this.consumerKey || !this.consumerSecret) {
      this.logger.warn(
        '⚠️ M-Pesa credentials not configured. Skipping token generation.',
      );
      this.logger.warn(
        'To enable M-Pesa, add MPESA_BASE_URL, MPESA_CONSUMER_KEY, and MPESA_CONSUMER_SECRET to your .env file',
      );
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
    await this.generateAccessToken();
  }

  async generateAccessToken() {
    if (!this.isConfigured) {
      this.logger.warn(
        'M-Pesa is not configured. Cannot generate access token.',
      );
      return null;
    }

    try {
      this.logger.debug(`MPESA_BASE_URL: ${this.baseURL}`);
      this.logger.debug(
        `MPESA_CONSUMER_KEY: ${this.consumerKey ? 'Set' : 'Not Set'}`,
      );
      this.logger.debug(
        `MPESA_CONSUMER_SECRET: ${this.consumerSecret ? 'Set' : 'Not Set'}`,
      );

      const auth = Buffer.from(
        `${this.consumerKey}:${this.consumerSecret}`,
      ).toString('base64');

      const response = await axios.get(
        `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.logger.log('✅ M-Pesa access token generated successfully');
      return this.accessToken;
    } catch (error: unknown) {
      const msg = (error as Error)?.message ?? String(error);
      this.logger.error('Failed to generate access token: ' + msg);
      throw error;
    }
  }

  // Method to check if M-Pesa is configured
  isMpesaConfigured(): boolean {
    return this.isConfigured;
  }

  private async ensureValidToken(): Promise<void> {
    if (Date.now() >= this.tokenExpiry) {
      await this.generateAccessToken();
    }
  }

  // src/mpesa/mpesa-daraja.service.ts
  // Update the stkPush method

  async stkPush(params: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<any> {
    await this.ensureValidToken();

    // Get and validate callback URL
    let callbackUrl = this.config.get<string>('STK_CALLBACK_URL');

    // Log the URL for debugging
    this.logger.debug(`Callback URL from config: ${callbackUrl}`);

    // Ensure the URL is valid
    if (!callbackUrl) {
      this.logger.warn('No callback URL configured, using default');
      callbackUrl = 'https://webhook.site/your-unique-id';
    }

    // Clean up the URL
    callbackUrl = callbackUrl.trim();
    // Remove trailing slashes
    callbackUrl = callbackUrl.replace(/\/+$/, '');
    // Ensure it starts with https://
    if (!callbackUrl.startsWith('https://')) {
      this.logger.warn(`Callback URL doesn't use HTTPS: ${callbackUrl}`);
      // For sandbox, we can accept http, but let's convert to https
      if (callbackUrl.startsWith('http://')) {
        callbackUrl = callbackUrl.replace('http://', 'https://');
      }
    }

    this.logger.debug(`Using callback URL: ${callbackUrl}`);

    const timestamp = this.getTimestamp();
    const password = Buffer.from(
      `${this.shortCode}${this.passKey}${timestamp}`,
    ).toString('base64');

    const requestData = {
      BusinessShortCode: this.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(params.amount),
      PartyA: params.phoneNumber,
      PartyB: this.shortCode,
      PhoneNumber: params.phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc,
    };

    console.log(
      '📤 STK Push Request:',
      JSON.stringify(
        {
          ...requestData,
          Password: '***HIDDEN***',
        },
        null,
        2,
      ),
    );

    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        const response = await axios.post(
          `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
          requestData,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
            timeout: 30000,
            httpsAgent: new https.Agent({
              rejectUnauthorized: false,
            }),
          },
        );

        console.log(
          '📥 STK Push Response:',
          JSON.stringify(response.data, null, 2),
        );

        if (response.data.ResponseCode === '0') {
          return {
            success: true,
            checkoutRequestID: response.data.CheckoutRequestID,
            message: response.data.ResponseDescription,
          };
        } else {
          return {
            success: false,
            message: response.data.ResponseDescription || 'STK Push failed',
            errorCode: response.data.ResponseCode,
          };
        }
      } catch (error: any) {
        lastError = error;
        retries--;

        // Don't retry if it's a validation error
        if (
          error.response?.data?.errorMessage?.includes('Invalid CallBackURL')
        ) {
          this.logger.error(
            'Invalid callback URL. Please check STK_CALLBACK_URL in .env',
          );
          return {
            success: false,
            message: 'Invalid callback URL. Please check configuration.',
          };
        }

        if (retries > 0) {
          this.logger.warn(
            `STK Push failed, retrying... (${retries} attempts left)`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    return {
      success: false,
      message: 'Failed to initiate STK Push after retries',
    };
  }

  // Update the queryStatus method
  async queryStatus(checkoutRequestID: string): Promise<any> {
    try {
      await this.ensureValidToken();

      const timestamp = this.getTimestamp();
      const password = Buffer.from(
        `${this.shortCode}${this.passKey}${timestamp}`,
      ).toString('base64');

      const requestData = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          timeout: 15000,
        },
      );

      if (response.data.ResultCode === '0') {
        return {
          success: true,
          isPaid: true,
          mpesaReceipt: response.data.ResultDesc,
          raw: response.data,
        };
      } else {
        return {
          success: true,
          isPaid: false,
          message: response.data.ResultDesc || 'Payment pending',
          raw: response.data,
        };
      }
    } catch (error: any) {
      console.error('Query status error:', error.message);

      // Handle 403/500 errors gracefully
      if (error.response?.status === 403 || error.response?.status === 500) {
        // Don't fail - just return pending status
        return {
          success: true,
          isPaid: false,
          message: 'Status check temporarily unavailable',
          warning: 'API returned error, assuming pending',
        };
      }

      return {
        success: false,
        isPaid: false,
        message: error.response?.data?.ResultDesc || 'Failed to query status',
        error: error.message,
      };
    }
  }

  private getTimestamp(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }
}
