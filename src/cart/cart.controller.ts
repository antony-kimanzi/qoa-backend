import {
  Get,
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Res,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../common/decorators';
import { Role } from '../auth/dto';
import { CartService } from './cart.service';
import { CartItemDto } from './dto';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { GuestInterceptor } from 'src/common/interceptors/guest.interceptor';
import { Guest } from 'src/common/decorators/guest.decorator';

type AuthenticatedRequest = Request & { user?: User };

@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get('me')
  @Guest()
  @UseInterceptors(GuestInterceptor)
  async getMyCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id || null;
    const guestId = (req.headers['x-guest-id'] as string) || null;

    const cart = await this.cartService.getCart(userId, guestId);
    return { data: { cart } };
  }

  @Get(':id')
  async fetchCartById(
    @Param('id', ParseIntPipe) cartId: number,
    @Res() res: Response,
  ) {
    const result = await this.cartService.fetchCartById(cartId);
    return res.json({ data: { cart: result.cart } });
  }

  @Get()
  @Roles(Role.Admin)
  async fetchCarts(@Res() res: Response) {
    const result = await this.cartService.fetchAllCarts();
    return res.json({ data: { carts: result.carts } });
  }

  @Post(':id')
  @Guest()
  @UseInterceptors(GuestInterceptor)
  async addCartItem(
    @Param('id', ParseIntPipe) productId: number,
    @Body() dto: CartItemDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const userId = req.user?.id || null;
    const guestId = (req.headers['x-guest-id'] as string) || null;

    await this.cartService.addItemToCart(dto, productId, userId, guestId);
    return res.json({ data: { message: 'Item added successfully' } });
  }

  @Delete(':id')
  @Guest()
  @UseInterceptors(GuestInterceptor)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCartItem(
    @Param('id', ParseIntPipe) itemId: number,
    @Res() res: Response,
  ) {
    await this.cartService.removeCartItem(itemId);
    return res.json({ data: { message: 'Item removed from cart' } });
  }

  @Delete()
  @Guest()
  @UseInterceptors(GuestInterceptor)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCart(@Res() res: Response, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.id || null;
    const guestId = (req.headers['x-guest-id'] as string) || null;
    await this.cartService.deleteCart(userId, guestId);
    return res.json({ data: { message: 'Cart deleted successfully' } });
  }
}
