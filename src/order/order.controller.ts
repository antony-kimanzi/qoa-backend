import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { Roles } from '../common/decorators';
import { Role } from '../auth/dto';
import { User } from '@prisma/client';

type AuthenticatedRequest = Request & { user?: User };

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @Roles(Role.User)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (req.user) {
      const user: User = req.user;
      const order = await this.orderService.createOrder(user.id, dto);
      return res.json({ data: { order } });
    } else {
      return { data: { success: false, message: 'User not found' } };
    }
  }

  @Get('user')
  @Roles(Role.User)
  async getMyOrders(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    if (req.user) {
      const user: User = req.user;
      const orders = await this.orderService.getOrdersForUser(user.id);
      return res.json({ data: { orders } });
    } else {
      return { data: { success: false, message: 'User not found' } };
    }
  }

  @Get(':id')
  @Roles(Role.User)
  async getOrderById(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const order = await this.orderService.getOrderById(id);
    return res.json({ data: { order } });
  }

  @Get()
  @Roles(Role.Admin)
  async getOrders(@Res() res: Response) {
    console.log('Fetching orders..');
    const orders = await this.orderService.getOrders();
    return res.json({ data: { orders } });
  }

  @Patch(':id')
  @Roles(Role.Admin)
  async updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @Res() res: Response,
  ) {
    const orderId = id;
    const order = await this.orderService.updateOrder(dto, orderId);
    return res.json({ data: { order } });
  }
}
