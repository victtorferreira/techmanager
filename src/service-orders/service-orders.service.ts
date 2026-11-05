import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './service-orders.dto';

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
  deliveryMethod?: 'DROP_OFF' | 'PICKUP';
  pickupAddress?: string;
  devicePhotos?: string[];
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

    if (input.deliveryMethod && !['DROP_OFF', 'PICKUP'].includes(input.deliveryMethod)) {
      throw new BadRequestException('Escolha coleta ou entrega na assistência.');
    }
    const pickupAddress = input.deliveryMethod === 'PICKUP' ? input.pickupAddress?.trim() : null;
    if (input.deliveryMethod === 'PICKUP' && (!pickupAddress || pickupAddress.length < 10 || pickupAddress.length > 500)) {
      throw new BadRequestException('Informe o endereço completo para a coleta (10 a 500 caracteres).');
    }
    const devicePhotos = input.devicePhotos ?? [];
    if (!Array.isArray(devicePhotos) || devicePhotos.length > 3) {
      throw new BadRequestException('Anexe no máximo 3 fotos do aparelho.');
    }
    for (const photo of devicePhotos) {
      const match = typeof photo === 'string' && photo.length <= 819250
        ? /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo) : null;
      if (!match) throw new BadRequestException('Envie fotos em JPG, PNG ou WebP.');
      const bytes = Buffer.from(match[2], 'base64');
      const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
        : match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (!valid || bytes.length > 600 * 1024 || bytes.toString('base64') !== match[2]) {
        throw new BadRequestException('Cada foto deve ser uma imagem válida de até 600 KB após a otimização.');
      }
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
          deliveryMethod: input.deliveryMethod || null,
          pickupAddress,
          devicePhotos,
          privacyAcceptedAt: new Date(),
        },
        select: { number: true },
      });
      return order;
    });

    return { number: created.number, tenantName: tenant.name };
  }

  list(tenantId: string, orderId?: string) {
    return this.prisma.serviceOrder.findMany({
      where: { tenantId, ...(orderId ? { id: orderId } : {}) },
      include: { customer: true, device: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  devices(tenantId: string, customerId: string) {
    return this.prisma.device.findMany({ where: { tenantId, customerId }, select: { id: true, brand: true, model: true, color: true, imei: true, serial: true }, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, data: CreateOrderDto) {
    if (Boolean(data.deviceId) === Boolean(data.device)) throw new BadRequestException('Selecione um aparelho existente ou informe os dados de um novo aparelho.');
    return this.prisma.$transaction(async tx => {
      const customer = await tx.customer.findFirst({ where: { id: data.customerId, tenantId } });
      if (!customer) throw new BadRequestException('Cliente não pertence a esta assistência.');
      const device = data.deviceId
        ? await tx.device.findFirst({ where: { id: data.deviceId, tenantId, customerId: data.customerId } })
        : await tx.device.create({ data: { tenantId, customerId: data.customerId,
          brand: data.device!.brand, model: data.device!.model, color: data.device!.color || null,
          imei: data.device!.imei || null, serial: data.device!.serial || null,
        } });
      if (!device) throw new BadRequestException('Aparelho não pertence a este cliente nesta assistência.');
      const number = await this.nextNumber(tx, tenantId);
      return tx.serviceOrder.create({
        data: {
          tenantId,
          number,
          customerId: data.customerId,
          deviceId: device.id,
          reportedIssue: data.reportedIssue,
          estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
        },
        include: { customer: true, device: true },
      });
    });
  }
}
