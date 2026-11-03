import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesService } from './sales.service';

class SaleLineDto {
  @IsUUID() productId!: string;
  @IsInt() @Min(1) @Max(10000) quantity!: number;
}

class CreateSaleDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => SaleLineDto)
  items!: SaleLineDto[];

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional() @IsUUID()
  customerId?: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

@ApiTags('Vendas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  list(@Req() req: any) {
    return this.sales.list(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateSaleDto) {
    return this.sales.create(req.user.tenantId, req.user.userId, dto);
  }
}
