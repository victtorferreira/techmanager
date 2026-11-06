import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto, DeviceQueryDto, OrderQueryDto, OrderPaymentDto, UpdateOrderDto } from './service-orders.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServiceOrdersService } from './service-orders.service';

@ApiTags('Ordens de serviço')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private service: ServiceOrdersService) {}
  @Get() list(@Req() req: any, @Query() query: OrderQueryDto) { return this.service.list(req.user.tenantId, query.orderId); }
  @Get('devices') devices(@Req() req: any, @Query() query: DeviceQueryDto) { return this.service.devices(req.user.tenantId, query.customerId); }
  @Post() create(@Req() req: any, @Body() dto: CreateOrderDto) { return this.service.create(req.user.tenantId, dto); }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrderDto) { return this.service.update(req.user.tenantId, id, dto); }
  @Post(':id/payments') pay(@Req() req: any, @Param('id') id: string, @Body() dto: OrderPaymentDto) { return this.service.pay(req.user.tenantId, id, req.user.userId, dto); }
}
