import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async createProduct(dto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          brand: dto.brand,
          price: dto.price,
          imageUrl: dto.imageUrl,
          desc: dto.desc,
          notes: dto.notes as any, // Just pass the object directly
          sex: dto.sex,
        },
        select: {
          id: true,
          name: true,
          brand: true,
          imageUrl: true,
          desc: true,
          notes: true,
          price: true,
          sex: true,
        },
      });
      return { product };
    } catch (error) {
      console.error('Error creating product: ', error);
      throw error;
    }
  }

  async fetchProducts() {
    try {
      const products = await this.prisma.product.findMany({
        select: {
          id: true,
          name: true,
          brand: true,
          imageUrl: true,
          desc: true,
          notes: true,
          price: true,
          sex: true,
        },
      });
      // No need to parse - Prisma already parsed the jsonb for us
      return { products };
    } catch (error) {
      console.error('Error while fetching products:', error);
      throw error;
    }
  }

  async fetchProductById(productId: number) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          brand: true,
          imageUrl: true,
          desc: true,
          notes: true,
          price: true,
          sex: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return { product };
    } catch (error) {
      console.error('Error while fetching product:', error);
      throw error;
    }
  }

  async updateProduct(dto: UpdateProductDto, productId: number) {
    try {
      const existingProduct = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct) {
        throw new NotFoundException('Product not found');
      }

      // Prepare update data
      const updateData: any = { ...dto };
      // If notes is provided, it's already an object, just pass it directly
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes as any;
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id: existingProduct.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          brand: true,
          imageUrl: true,
          desc: true,
          notes: true,
          price: true,
          sex: true,
        },
      });

      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: number) {
    try {
      const existingProduct = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct) {
        throw new NotFoundException('Product not found');
      }

      return await this.prisma.product.delete({
        where: { id: existingProduct.id },
      });
    } catch (error) {
      console.error('Error while deleting product:', error);
      throw error;
    }
  }

  async searchProducts(query: string) {
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { desc: { contains: query, mode: 'insensitive' } },
        ],
      },

      take: 20, // Limit results
    });

    return { products };
  }
}
