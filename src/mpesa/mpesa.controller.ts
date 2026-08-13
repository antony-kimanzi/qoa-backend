// src/mpesa/mpesa.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Patch,
} from '@nestjs/common';
import { MpesaService } from './mpesa.service';
import { Role } from '../auth/dto';
import { User } from '@prisma/client';
import { Public, Roles } from 'src/common/decorators';
import { InitiatePaymentDto, UpdatePaymentDto } from './dto';
import { Response } from 'express';

type AuthenticatedRequest = Request & { user?: User };

@Controller('payment')
export class MpesaController {
  constructor(private mpesaService: MpesaService) {}

  @Post('initiate')
  @Roles(Role.User)
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user) {
      console.log('Payment data:', dto);
      const user: User = req.user;
      const result = await this.mpesaService.initiatePayment(
        dto.phoneNumber,
        dto.amount,
        dto.orderId,
        user.id,
      );

      // CRITICAL FIX: Return the result directly, not nested in { data: { result } }
      // This matches what the frontend expects
      return result;
    } else {
      return {
        success: false,
        message: 'User not found',
      };
    }
  }

  @Post('callback')
  @Public() // Make this endpoint public since Safaricom calls it
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Body() callbackData: any) {
    console.log('Received M-Pesa callback');
    const result = await this.mpesaService.handleCallback(callbackData);
    return { data: { result } };
  }

  @Get('status/:checkoutRequestID')
  @Roles(Role.User)
  async checkStatus(@Param('checkoutRequestID') checkoutRequestID: string) {
    console.log('Checking transaction status');
    const data =
      await this.mpesaService.checkTransactionStatus(checkoutRequestID);

    console.log('Results after checking status:', data);
    return { data };
  }

  @Get()
  @Roles(Role.Admin)
  async getTransactions(@Res() res: Response) {
    const transactions = await this.mpesaService.getTransactions();
    return res.json({ data: { transactions } });
  }

  @Patch(':id')
  @Roles(Role.Admin)
  async updateTransaction(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @Res() res: Response,
  ) {
    const transaction = await this.mpesaService.updateTransaction(id, dto);
    return res.json({ data: { transaction } });
  }
}
