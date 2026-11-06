import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinanceEntryStatus, FinanceEntryType, PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinanceService } from './finance.service';

class FinanceSummaryQuery {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
}

class CreateFinanceEntryDto {
  @IsEnum(FinanceEntryType) type!: FinanceEntryType;
  @IsEnum(FinanceEntryStatus) status!: FinanceEntryStatus;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 60) category!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 240) description!: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(999999999)
  amount!: number;

  @IsOptional() @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsDateString()
  occurredAt!: string;
}

class UpdateFinanceEntryStatusDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) paidAt?: string;
  @IsIn([FinanceEntryStatus.PAID, FinanceEntryStatus.CANCELED])
  status!: FinanceEntryStatus;

  @IsOptional() @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

@ApiTags('Financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  summary(@Req() req: any, @Query() query: FinanceSummaryQuery) {
    return this.finance.summary(req.user.tenantId, query.from, query.to);
  }

  @Post('entries')
  create(@Req() req: any, @Body() dto: CreateFinanceEntryDto) {
    return this.finance.create(req.user.tenantId, req.user.userId, dto);
  }

  @Patch('entries/:id/status')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateFinanceEntryStatusDto) {
    return this.finance.updateStatus(req.user.tenantId, id, dto.status, dto.paymentMethod, dto.paidAt);
  }
}
