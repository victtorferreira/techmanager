import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

class ReportPeriodQuery {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
}

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@Req() req: any, @Query() query: ReportPeriodQuery) {
    return this.reports.summary(req.user.tenantId, query.from, query.to);
  }
}
