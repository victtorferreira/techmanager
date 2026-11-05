import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerClassification, CustomerPriceTable, CustomerType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from './customers.service';

class CustomerFieldsDto {
  @IsOptional() @IsEnum(CustomerType) customerType?: CustomerType;
  @IsOptional() @IsString() @MaxLength(500000) photoData?: string | null;
  @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(30) whatsapp?: string | null;
  @IsOptional() @IsBoolean() whatsappSameAsPhone?: boolean;
  @IsOptional() @IsEmail() @MaxLength(160) email?: string | null;
  @IsOptional() @IsString() @MaxLength(40) document?: string | null;
  @IsOptional() @IsDateString() dateOfBirth?: string | null;
  @IsOptional() @IsString() @MaxLength(9) zipCode?: string | null;
  @IsOptional() @IsString() @MaxLength(160) street?: string | null;
  @IsOptional() @IsString() @MaxLength(30) addressNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(100) complement?: string | null;
  @IsOptional() @IsString() @MaxLength(100) neighborhood?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsString() @MaxLength(2) state?: string | null;
  @IsOptional() @IsString() @MaxLength(200) addressReference?: string | null;
  @IsOptional() @IsString() @MaxLength(80) deliveryRoute?: string | null;
  @IsOptional() @IsBoolean() isTaxPayer?: boolean | null;
  @IsOptional() @IsString() @MaxLength(40) stateRegistration?: string | null;
  @IsOptional() @IsString() @MaxLength(10) cityIbgeCode?: string | null;
  @IsOptional() @IsString() @MaxLength(40) municipalRegistration?: string | null;
  @IsOptional() @IsEmail() @MaxLength(160) invoiceEmail?: string | null;
  @IsOptional() @IsEnum(CustomerClassification) classification?: CustomerClassification;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999999999) creditLimit?: number;
  @IsOptional() @IsEnum(CustomerPriceTable) priceTable?: CustomerPriceTable;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) discountPercent?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}
class CreateCustomerDto extends CustomerFieldsDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
}
class UpdateCustomerDto extends CustomerFieldsDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
}
@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}
  @Get() list(@Req() req: any) { return this.service.list(req.user.tenantId); }
  @Get(':id') find(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.find(req.user.tenantId, id); }
  @Post() create(@Req() req: any, @Body() dto: CreateCustomerDto) { return this.service.create(req.user.tenantId, dto); }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.service.update(req.user.tenantId, id, dto); }
}
