// src/mpesa/mpesa.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MpesaDarajaService } from './mpesa-daraja.service';
import { UpdatePaymentDto } from './dto';

@Injectable()
export class MpesaService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private darajaService: MpesaDarajaService,
  ) {}

  async initiatePayment(
    phone: string,
    amount: number,
    orderId: number,
    userId: number,
  ) {
    try {
      console.log('Payment data:', phone, amount, orderId, userId);
      const formattedPhone = this.formatPhoneNumber(phone);

      let order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        console.log(
          `Order ${orderId} not found. Creating one automatically...`,
        );
        order = await this.prisma.order.create({
          data: {
            userId: userId,
            totalAmount: amount,
            contact: `user-${userId}@example.com`,
            isPaid: false,
            orderStatus: 'pending_payment',
            paymentMethod: 'mpesa',
            shippingMethod: 'pickup',
          },
        });
        console.log(`✅ Created new order with ID: ${order.id}`);
        orderId = order.id;
      }

      const accountRef = `ORDER-${orderId}-${Date.now()}`;

      const result = await this.darajaService.stkPush({
        phoneNumber: formattedPhone,
        amount: amount,
        accountReference: accountRef,
        transactionDesc: `Payment for Order ${orderId}`,
      });

      console.log('Daraja STK Push result:', result);

      if (result.success) {
        // Check if transaction already exists with this checkoutRequestID
        const existingTransaction = await this.prisma.transaction.findUnique({
          where: { checkoutRequestID: result.checkoutRequestID },
        });

        if (existingTransaction) {
          console.log('Transaction already exists:', existingTransaction);
          return {
            success: true,
            message: 'Payment already initiated',
            checkoutRequestID: result.checkoutRequestID,
            transactionId: existingTransaction.id,
            orderId: orderId,
          };
        }

        const transaction = await this.prisma.transaction.create({
          data: {
            checkoutRequestID: result.checkoutRequestID,
            phoneNumber: formattedPhone,
            amount: amount,
            status: 'pending',
            orderId: orderId,
            userId: userId,
          },
        });

        return {
          success: true,
          message: 'Payment initiated successfully',
          checkoutRequestID: result.checkoutRequestID,
          transactionId: transaction.id,
          orderId: orderId,
        };
      }

      return {
        success: false,
        message: result.message || 'Failed to initiate payment',
        errorCode: result.errorCode,
      };
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      return {
        success: false,
        message: error.message || 'Payment initiation failed',
      };
    }
  }

  async handleCallback(callbackData: any) {
    try {
      console.log(
        '📥 Received M-Pesa callback:',
        JSON.stringify(callbackData, null, 2),
      );

      const { Body } = callbackData;
      if (!Body || !Body.stkCallback) {
        console.error('Invalid callback structure:', callbackData);
        return { success: false, message: 'Invalid callback data' };
      }

      const { stkCallback } = Body;
      const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } =
        stkCallback;

      console.log(`Callback Result: ${ResultCode} - ${ResultDesc}`);
      console.log(`CheckoutRequestID: ${CheckoutRequestID}`);

      if (!CheckoutRequestID) {
        console.error('Missing CheckoutRequestID in callback');
        return { success: false, message: 'Missing CheckoutRequestID' };
      }

      const transaction = await this.prisma.transaction.findUnique({
        where: { checkoutRequestID: CheckoutRequestID },
        include: { order: true },
      });

      if (!transaction) {
        console.error('❌ Transaction not found for:', CheckoutRequestID);
        return {
          success: true,
          message: 'Transaction not found but acknowledged',
        };
      }

      console.log(
        `Found transaction: ${transaction.id} for order: ${transaction.orderId}`,
      );

      if (ResultCode === 0) {
        const mpesaReceipt = CallbackMetadata?.Item?.find(
          (item: any) => item.Name === 'MpesaReceiptNumber',
        )?.Value;

        const transactionDate = CallbackMetadata?.Item?.find(
          (item: any) => item.Name === 'TransactionDate',
        )?.Value;

        const amount = CallbackMetadata?.Item?.find(
          (item: any) => item.Name === 'Amount',
        )?.Value;

        console.log(
          `✅ Payment confirmed! Receipt: ${mpesaReceipt}, Amount: ${amount}`,
        );

        // Update transaction - handle duplicate receipt gracefully
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'completed',
            mpesaReceipt: mpesaReceipt || null,
            transactionDate: transactionDate
              ? new Date(transactionDate)
              : new Date(),
          },
        });

        if (transaction.orderId) {
          await this.prisma.order.update({
            where: { id: transaction.orderId },
            data: {
              isPaid: true,
              orderStatus: 'paid',
            },
          });
          console.log(`✅ Order ${transaction.orderId} marked as paid`);
        }

        return {
          success: true,
          message: 'Payment confirmed',
          mpesaReceipt,
          orderId: transaction.orderId,
        };
      } else {
        console.log(`❌ Payment failed: ${ResultDesc}`);

        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'failed',
          },
        });

        return {
          success: false,
          message: ResultDesc || 'Payment failed',
          errorCode: ResultCode,
        };
      }
    } catch (error: any) {
      console.error('❌ Error handling callback:', error);
      // Handle unique constraint error gracefully
      if (error.code === 'P2002') {
        console.log('Duplicate receipt detected, ignoring...');
        return { success: true, message: 'Duplicate callback ignored' };
      }
      return {
        success: false,
        message: 'Error processing callback',
      };
    }
  }

  async checkTransactionStatus(checkoutRequestID: string) {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { checkoutRequestID },
        select: {
          id: true,
          orderId: true,
          userId: true,
          amount: true,
          status: true,
          phoneNumber: true,
          mpesaReceipt: true,
          checkoutRequestID: true,
          transactionDate: true,
          createdAt: true,
        },
      });

      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      // If already completed, return success
      if (transaction.status === 'completed') {
        return {
          success: true,
          status: transaction.status,
          isPaid: true,
          transaction,
          mpesaReceipt: transaction.mpesaReceipt,
        };
      }

      // Check with Daraja API
      try {
        const status = await this.darajaService.queryStatus(checkoutRequestID);
        console.log('Query status result:', status);

        if (status.success && status.isPaid !== undefined) {
          // Only update if not already completed
          if (status.isPaid && transaction.status !== 'completed') {
            await this.prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: 'completed',
                mpesaReceipt: status.mpesaReceipt || null,
                transactionDate: new Date(),
              },
            });

            await this.prisma.order.update({
              where: { id: transaction.orderId },
              data: {
                isPaid: true,
                orderStatus: 'paid',
              },
            });

            return {
              success: true,
              status: 'completed',
              isPaid: true,
              transaction: {
                ...transaction,
                status: 'completed',
                mpesaReceipt: status.mpesaReceipt,
              },
            };
          }
        }

        return {
          success: true,
          status: transaction.status,
          isPaid: transaction.status === 'completed',
          transaction,
        };
      } catch (statusError: any) {
        console.error(
          'Error checking status with Daraja:',
          statusError.message,
        );
        // If we get 403/500 errors, don't fail - just return current transaction status
        return {
          success: true,
          status: transaction.status,
          isPaid: transaction.status === 'completed',
          transaction,
          warning: 'Could not verify with Daraja, using cached status',
        };
      }
    } catch (error: any) {
      console.error('Error checking transaction status:', error);
      return {
        success: false,
        message: 'Failed to check transaction status',
        error: error.message,
      };
    }
  }

  async getTransactions() {
    const transactions = await this.prisma.transaction.findMany();

    if (!transactions) {
      throw new NotFoundException('transactions not found');
    }

    return transactions;
  }

  async updateTransaction(transactionId: string, dto: UpdatePaymentDto) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: dto,
    });

    return { updatedTransaction };
  }
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  }
}
