import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { PublicRepairRequest, ServiceOrdersService } from './service-orders.service';

class CreatePublicRepairRequestDto implements PublicRepairRequest {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 100)
  name!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Matches(/^[+()\d\s.-]{8,25}$/)
  phone!: string;

  @Transform(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value)
  @IsOptional() @IsEmail() @Length(3, 160)
  email?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 80)
  brand!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 100)
  model!: string;

  @Transform(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value)
  @IsOptional() @IsString() @Length(1, 50)
  color?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(10, 2000)
  reportedIssue!: string;

  @Transform(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value)
  @IsOptional() @IsString() @Length(1, 500)
  accessories?: string;

  @IsBoolean()
  devicePowersOn!: boolean;

  @IsBoolean()
  liquidDamage!: boolean;

  @IsBoolean()
  previousRepair!: boolean;

  @IsIn(['WHATSAPP', 'PHONE', 'EMAIL'])
  preferredContact!: 'WHATSAPP' | 'PHONE' | 'EMAIL';

  @Transform(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value)
  @IsOptional() @IsString() @Length(1, 100)
  contactTime?: string;

  @IsOptional() @IsIn(['DROP_OFF', 'PICKUP'])
  deliveryMethod?: 'DROP_OFF' | 'PICKUP';

  @Transform(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value)
  @IsOptional() @IsString() @Length(10, 500)
  pickupAddress?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(3)
  @IsString({ each: true }) @MaxLength(819250, { each: true })
  devicePhotos?: string[];

  @Equals(true)
  privacyAccepted!: boolean;
}

@ApiTags('Solicitação pública')
@Controller('public/repair-requests')
export class PublicRepairRequestsController {
  constructor(private readonly service: ServiceOrdersService) {}

  @Get(':slug')
  getAssistance(@Param('slug') slug: string) {
    return this.service.publicTenant(slug);
  }

  @Post(':slug')
  create(@Param('slug') slug: string, @Body() dto: CreatePublicRepairRequestDto) {
    const { privacyAccepted: _privacyAccepted, ...request } = dto;
    return this.service.createPublicRequest(slug, request);
  }
}
