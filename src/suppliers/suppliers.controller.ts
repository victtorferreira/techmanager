import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupplierDto, SupplierQueryDto } from './suppliers.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Fornecedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}
  @Get() list(@Req() req: any, @Query() query: SupplierQueryDto) { return this.service.list(req.user.tenantId, query); }
  @Post() create(@Req() req: any, @Body() dto: SupplierDto) { return this.service.create(req.user.tenantId, dto); }
  @Put(':id') update(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SupplierDto) { return this.service.update(req.user.tenantId, id, dto); }
  @Delete(':id') remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.remove(req.user.tenantId, id); }
}
