import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CartItemDto {
  @IsNumber()
  @Min(1)
  quantity: number;
}
