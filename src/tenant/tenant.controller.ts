import { Body, Controller, ForbiddenException, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantService } from './tenant.service';

class UpdateTenantProfileDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 80)
  name!: string;
}

@ApiTags('Assistência')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant/profile')
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  @Get()
  getProfile(@Req() req: any) {
    return this.tenant.getProfile(req.user.tenantId);
  }

  @Patch()
  updateProfile(@Req() req: any, @Body() dto: UpdateTenantProfileDto) {
    if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
      throw new ForbiddenException('Somente proprietários e administradores podem alterar os dados da assistência.');
    }
    return this.tenant.updateName(req.user.tenantId, dto.name);
  }
}
