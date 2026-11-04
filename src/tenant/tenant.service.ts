import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, logo: true },
    });
    if (!tenant) throw new NotFoundException('Assistência não encontrada.');
    return tenant;
  }

  async updateProfile(tenantId: string, name: string, logo?: string | null) {
    if (logo !== undefined && logo !== null) {
      const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(logo);
      if (!match) throw new BadRequestException('Envie uma logo em PNG, JPG ou WebP.');
      const bytes = Buffer.from(match[2], 'base64');
      const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
        : match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (!valid || bytes.length > 256 * 1024 || bytes.toString('base64') !== match[2]) {
        throw new BadRequestException('A logo deve ser uma imagem PNG, JPG ou WebP de até 256 KB.');
      }
    }
    const tenant = await this.prisma.tenant.updateMany({ where: { id: tenantId }, data: { name, ...(logo !== undefined ? { logo } : {}) } });
    if (tenant.count !== 1) throw new NotFoundException('Assistência não encontrada.');
    return this.getProfile(tenantId);
  }
}
