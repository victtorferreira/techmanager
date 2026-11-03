import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';

class CreateProductDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() category?: string;
  @IsNumber() @Min(0) costPrice!: number;
  @IsNumber() @Min(0) salePrice!: number;
  @IsOptional() @IsInt() @Min(0) stockQuantity?: number;
  @IsOptional() @IsInt() @Min(0) minimumStock?: number;
}
@ApiTags('Produtos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}
  @Get() list(@Req() req: any) { return this.service.list(req.user.tenantId); }
  @Post() create(@Req() req: any, @Body() dto: CreateProductDto) { return this.service.create(req.user.tenantId, dto); }
}
