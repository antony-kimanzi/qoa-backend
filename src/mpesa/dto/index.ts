// src/mpesa/dto/index.ts
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  IsOptional,
} from 'class-validator';

export class InitiatePaymentDto {
  @IsNotEmpty()
  @IsString()
  phoneNumber!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsNotEmpty()
  @IsNumber()
  orderId!: number;
}

export class UpdatePaymentDto {
  @IsString()
  @IsOptional()
  status?: string;
}
