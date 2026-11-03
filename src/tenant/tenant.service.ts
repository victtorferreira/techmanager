import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) throw new NotFoundException('Assistência não encontrada.');
    return tenant;
  }

  async updateName(tenantId: string, name: string) {
    const tenant = await this.prisma.tenant.updateMany({ where: { id: tenantId }, data: { name } });
    if (tenant.count !== 1) throw new NotFoundException('Assistência não encontrada.');
    return this.getProfile(tenantId);
  }
}
