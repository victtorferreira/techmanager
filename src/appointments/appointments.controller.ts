import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';

class ListAppointmentsQuery {
  @IsOptional() @IsDateString()
  from?: string;
  @IsOptional() @IsDateString()
  to?: string;
}

class CreateAppointmentDto {
  @IsUUID()
  customerId!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 100)
  title!: string;

  @Transform(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value)
  @IsOptional() @IsString() @MaxLength(120)
  deviceDescription?: string;

  @Transform(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value)
  @IsOptional() @IsString() @MaxLength(1000)
  details?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}

@ApiTags('Agenda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  list(@Req() req: any, @Query() query: ListAppointmentsQuery) {
    return this.appointments.list(req.user.tenantId, query.from, query.to);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(req.user.tenantId, dto);
  }

  @Patch(':id/status')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return this.appointments.updateStatus(req.user.tenantId, id, dto.status);
  }
}
