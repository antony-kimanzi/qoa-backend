import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsUrl,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client'; // Import Prisma types

export type ProductNotesInput = Prisma.InputJsonValue;

export enum Sex {
  Male = 'Male',
  Female = 'Female',
  Unisex = 'Unisex',
}

// DTO for notes
export class ProductNotesDto {
  @IsArray()
  @IsString({ each: true })
  top_notes: string[];

  @IsArray()
  @IsString({ each: true })
  heart_notes: string[];

  @IsArray()
  @IsString({ each: true })
  base_notes: string[];
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsOptional()
  desc?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProductNotesDto)
  notes?: ProductNotesDto | Prisma.InputJsonValue;

  @IsEnum(Sex)
  @IsOptional()
  sex?: Sex;

  @IsString()
  @IsOptional()
  tone?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @IsString()
  @IsOptional()
  shortDescription?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
