import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cart, CartItem, Product } from '@prisma/client';
import { CartItemDto } from './dto';
import { GuestService } from 'src/guest/guest.service';

interface CartItemWithProduct extends CartItem {
  product: Product;
}

interface CartWithItems extends Cart {
  items: CartItemWithProduct[];
}

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private guestService: GuestService,
  ) {}

  async getCart(userId: number | null, guestId: string | null) {
    if (userId) {
      // User is authenticated
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart) {
        return this.prisma.cart.create({
          data: { userId },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });
      }

      return cart;
    }

    if (guestId) {
      // Guest user
      return this.guestService.getOrCreateGuestCart(guestId);
    }

    throw new Error('No user or guest ID provided');
  }

  async addItemToCart(
    dto: CartItemDto,
    productId: number,
    userId: number | null,
    guestId: string | null,
  ) {
    try {
      // Get or create cart
      const cart = await this.getCart(userId, guestId);

      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Check if item already exists in cart
      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: productId,
        },
      });

      if (existingItem) {
        // Update quantity if item exists
        const updatedItem = await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + dto.quantity },
        });
        return updatedItem;
      }

      const cartItem = await this.prisma.cartItem.create({
        data: {
          quantity: dto.quantity,
          productId: productId,
          cartId: cart.id,
        },
      });
      return cartItem;
    } catch (error) {
      console.error('Error occurred while adding item to cart:', error);
      throw error;
    }
  }

  async updateItemQuantity(dto: CartItemDto, itemId: number) {
    try {
      const item = await this.prisma.cartItem.findUnique({
        where: { id: itemId },
      });
      if (!item) {
        throw new NotFoundException('Item not found in cart');
      }

      const updatedItem = await this.prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: dto.quantity },
      });
      return { updatedItem };
    } catch (error) {
      console.error('Error occurred while updating item to cart:', error);
      throw error;
    }
  }

  async removeCartItem(itemId: number) {
    try {
      const item = await this.prisma.cartItem.findUnique({
        where: { id: itemId },
      });
      if (!item) {
        throw new NotFoundException('Item not found in cart');
      }

      return await this.prisma.cartItem.delete({ where: { id: item.id } });
    } catch (error) {
      console.error('Error occurred while removing item from cart:', error);
      throw error;
    }
  }

  async fetchAllCarts() {
    try {
      const carts = await this.prisma.cart.findMany();
      if (!carts) {
        throw new NotFoundException('Cart not found');
      }
      return { carts };
    } catch (error) {
      console.error('Error occurred while fetching carts:', error);
      throw error;
    }
  }

  async fetchCartById(cartId: number) {
    try {
      const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }
      return { cart };
    } catch (error) {
      console.error(`Error while fetching cart of id.no ${cartId}:`, error);
      throw error;
    }
  }

  async deleteCart(userId: number | null, guestId: string | null) {
    try {
      let cart: Cart;
      if (userId) {
        cart = await this.prisma.cart.findUnique({
          where: { userId },
        });
      }

      if (guestId) {
        cart = await this.prisma.cart.findUnique({ where: { guestId } });
      }

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      return await this.prisma.cart.delete({ where: { id: cart.id } });
    } catch (error) {
      console.error('Error while deleting cart: ', error);
      throw error;
    }
  }
}
