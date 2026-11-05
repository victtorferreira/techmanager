import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto, DeviceQueryDto, OrderQueryDto } from './service-orders.dto';
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
}
