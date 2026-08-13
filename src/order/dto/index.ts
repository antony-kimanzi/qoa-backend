import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
  IsEmail,
  isString,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from 'node_modules/.prisma/client';

export class BillingDataDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phoneNumber: string;
}

export class ShippingDataDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phoneNumber: string;

  @IsEmail()
  email: string;

  @IsString()
  city: string;

  @IsString()
  streetAddress: string;

  @IsString()
  @IsOptional()
  apartment?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  deliveryInstructions?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  contact: string; // Add this required field

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @IsBoolean()
  @IsNotEmpty()
  isPaid: boolean;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BillingDataDto)
  billing?: BillingDataDto | Prisma.InputJsonValue;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingDataDto)
  shipping?: ShippingDataDto | Prisma.InputJsonValue;
}

export class UpdateOrderDto {
  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @IsString()
  @IsOptional()
  orderStatus?: string;
}
