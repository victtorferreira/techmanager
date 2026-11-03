import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServiceOrdersService } from './service-orders.service';

class CreateOrderDto {
  @IsString() customerId!: string;
  @IsString() deviceId!: string;
  @IsString() @MinLength(3) reportedIssue!: string;
  @IsOptional() @IsDateString() estimatedDelivery?: string;
}
@ApiTags('Ordens de serviço')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private service: ServiceOrdersService) {}
  @Get() list(@Req() req: any) { return this.service.list(req.user.tenantId); }
  @Post() create(@Req() req: any, @Body() dto: CreateOrderDto) { return this.service.create(req.user.tenantId, dto); }
}
