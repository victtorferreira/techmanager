import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateProductDto, ProductDto, MovementDto, HistoryQueryDto, PurchaseQueryDto } from './products.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';

@ApiTags('Produtos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}
  @Get() list(@Req() req: any) { return this.service.list(req.user.tenantId); }
  @Get('purchases') purchases(@Req() req: any, @Query() query: PurchaseQueryDto) { return this.service.purchases(req.user.tenantId, query); }
  @Get('service-orders') orderOptions(@Req() req: any) { return this.service.orderOptions(req.user.tenantId); }
  @Post() create(@Req() req: any, @Body() dto: CreateProductDto) { return this.service.create(req.user.tenantId, dto, req.user.userId); }
  @Put(':id') update(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ProductDto) { return this.service.update(req.user.tenantId, id, dto); }
  @Get(':id/movements') history(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query() query: HistoryQueryDto) { return this.service.history(req.user.tenantId, id, query.page); }
  @Post(':id/movements') move(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MovementDto) { return this.service.move(req.user.tenantId, id, dto, req.user.userId); }
}
