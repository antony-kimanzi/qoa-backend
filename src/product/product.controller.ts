import {
  Get,
  Body,
  Controller,
  Post,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  Res,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { Roles, Public } from '../common/decorators';
import { Role } from '../auth/dto';
import { CreateProductDto, UpdateProductDto } from './dto';
import { Response } from 'express';

@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  @Roles(Role.Admin)
  async createProduct(@Body() dto: CreateProductDto, @Res() res: Response) {
    const result = await this.productService.createProduct(dto);
    return res.json({ data: { product: result.product } });
  }

  @Get()
  @Roles(Role.Admin)
  async fetchProducts(@Res() res: Response) {
    const result = await this.productService.fetchProducts();
    return res.json({ data: { products: result.products } });
  }

  // ⚠️ IMPORTANT: Search route MUST come BEFORE the :id route
  @Get('search')
  @Public()
  async searchProducts(@Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return { data: { products: [] } };
    }
    return this.productService.searchProducts(query.trim());
  }

  @Get(':id')
  @Public()
  async fetchProductById(
    @Param('id', ParseIntPipe) productId: number,
    @Res() res: Response,
  ) {
    const result = await this.productService.fetchProductById(productId);
    return res.json({ data: { product: result.product } });
  }

  @Patch(':id')
  @Roles(Role.Admin)
  async updateProduct(
    @Param('id', ParseIntPipe) productId: number,
    @Body() dto: UpdateProductDto,
    @Res() res: Response,
  ) {
    await this.productService.updateProduct(dto, productId);
    return res.json({ data: { message: 'Product updated successfully' } });
  }

  @Delete(':id')
  @Roles(Role.Admin)
  async deleteProduct(
    @Param('id', ParseIntPipe) productId: number,
    @Res() res: Response,
  ) {
    await this.productService.deleteProduct(productId);
    return res.json({ data: { message: 'Product deleted successfully' } });
  }
}
