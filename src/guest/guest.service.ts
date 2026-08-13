import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GuestService {
  constructor(private prisma: PrismaService) {}

  // Generate a new guest ID
  generateGuestId(): string {
    return `guest_${uuidv4()}`;
  }

  // Get or create guest cart
  async getOrCreateGuestCart(guestId: string) {
    // Check for existing cart with guestId
    const cart = await this.prisma.cart.findUnique({
      where: { guestId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Return existing cart if still valid
    if (cart && (!cart.expiresAt || new Date() <= cart.expiresAt)) {
      return cart;
    }

    // Create a new guest cart if none exists or if it has expired
    return this.prisma.cart.create({
      data: {
        guestId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userId: null,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  // Transfer guest cart to user cart
  async transferGuestCartToUser(guestId: string, userId: number) {
    // Get guest cart
    const guestCart = await this.prisma.cart.findUnique({
      where: { guestId },
      include: {
        items: true,
      },
    });

    if (!guestCart) return null;

    // Check if user already has a cart
    let userCart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!userCart) {
      // Create user cart if doesn't exist
      userCart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Transfer items from guest cart to user cart
    for (const item of guestCart.items) {
      // Check if item already exists in user cart
      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productId: item.productId,
        },
      });

      if (existingItem) {
        // Update quantity if item exists
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + item.quantity,
          },
        });
      } else {
        // Create new item if doesn't exist
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }
    }

    // Delete guest cart
    await this.prisma.cart.delete({
      where: { id: guestCart.id },
    });

    // Return the user's cart with items
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  // Clean up expired guest carts (can be run as a cron job)
  async cleanupExpiredCarts() {
    const expiredCarts = await this.prisma.cart.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        userId: null, // Only guest carts
      },
      include: {
        items: true,
      },
    });

    for (const cart of expiredCarts) {
      // Delete items first
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      // Then delete the cart
      await this.prisma.cart.delete({
        where: { id: cart.id },
      });
    }

    return {
      deleted: expiredCarts.length,
    };
  }
}
