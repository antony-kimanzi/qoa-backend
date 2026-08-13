// src/mpesa/mpesa.module.ts
import { Module } from '@nestjs/common';
import { MpesaService } from './mpesa.service';
import { MpesaDarajaService } from './mpesa-daraja.service';
import { MpesaController } from './mpesa.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MpesaController],
  providers: [MpesaService, MpesaDarajaService],
  exports: [MpesaService],
})
export class MpesaModule {}
