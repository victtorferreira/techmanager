import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PublicRepairRequest = {
  name: string;
  phone: string;
  email?: string;
  brand: string;
  model: string;
  color?: string;
  reportedIssue: string;
  accessories?: string;
  devicePowersOn: boolean;
  liquidDamage: boolean;
  previousRepair: boolean;
  preferredContact: 'WHATSAPP' | 'PHONE' | 'EMAIL';
  contactTime?: string;
};

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  private async nextNumber(tx: Prisma.TransactionClient, tenantId: string) {
    await tx.$queryRaw`WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${tenantId}))) SELECT 1 FROM lock`;
    const last = await tx.serviceOrder.findFirst({
      where: { tenantId }, orderBy: { number: 'desc' }, select: { number: true },
    });
    return (last?.number ?? 0) + 1;
  }

  async publicTenant(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug }, select: { name: true, phone: true, slug: true, logo: true },
    });
    if (!tenant) throw new NotFoundException('Assistência não encontrada.');
    return tenant;
  }

  async createPublicRequest(slug: string, input: PublicRepairRequest) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!tenant) throw new NotFoundException('Assistência não encontrada.');
    if (input.preferredContact === 'EMAIL' && !input.email) {
      throw new BadRequestException('Informe um e-mail para receber contato por e-mail.');
    }

    const phone = input.phone.replace(/[^\d+]/g, '');
    const created = await this.prisma.$transaction(async tx => {
      const customer = await tx.customer.create({
        data: { tenantId: tenant.id, name: input.name, phone, email: input.email || null },
      });
      const device = await tx.device.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          brand: input.brand,
          model: input.model,
          color: input.color || null,
        },
      });
      const number = await this.nextNumber(tx, tenant.id);
      const order = await tx.serviceOrder.create({
        data: {
          tenantId: tenant.id,
          number,
          customerId: customer.id,
          deviceId: device.id,
          reportedIssue: input.reportedIssue,
          publicRequest: true,
          accessories: input.accessories || null,
          devicePowersOn: input.devicePowersOn,
          liquidDamage: input.liquidDamage,
          previousRepair: input.previousRepair,
          preferredContact: input.preferredContact,
          contactTime: input.contactTime || null,
          privacyAcceptedAt: new Date(),
        },
        select: { number: true },
      });
      return order;
    });

    return { number: created.number, tenantName: tenant.name };
  }

  list(tenantId: string) {
    return this.prisma.serviceOrder.findMany({
      where: { tenantId },
      include: { customer: true, device: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(tenantId: string, data: { customerId: string; deviceId: string; reportedIssue: string; estimatedDelivery?: string }) {
    return this.prisma.$transaction(async tx => {
      const [customer, device] = await Promise.all([
        tx.customer.findFirst({ where: { id: data.customerId, tenantId } }),
        tx.device.findFirst({ where: { id: data.deviceId, tenantId, customerId: data.customerId } }),
      ]);
      if (!customer || !device) throw new BadRequestException('Cliente ou aparelho não pertence a esta assistência.');
      const number = await this.nextNumber(tx, tenantId);
      return tx.serviceOrder.create({
        data: {
          tenantId,
          number,
          customerId: data.customerId,
          deviceId: data.deviceId,
          reportedIssue: data.reportedIssue,
          estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
        },
        include: { customer: true, device: true },
      });
    });
  }
}
