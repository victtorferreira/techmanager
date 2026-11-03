import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CreateAppointmentInput = {
  customerId: string;
  title: string;
  deviceDescription?: string;
  details?: string;
  startsAt: string;
  endsAt: string;
};

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string, from?: string, to?: string) {
    const startsAt: { gte?: Date; lt?: Date } = {};
    if (from) startsAt.gte = new Date(from);
    if (to) startsAt.lt = new Date(to);
    return this.prisma.appointment.findMany({
      where: { tenantId, ...(from || to ? { startsAt } : {}) },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
  }

  async create(tenantId: string, input: CreateAppointmentInput) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('O horário de término deve ser posterior ao início.');
    }
    const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { id: true } });
    if (!customer) throw new BadRequestException('Cliente não pertence a esta assistência.');
    return this.prisma.appointment.create({
      data: {
        tenantId,
        customerId: input.customerId,
        title: input.title,
        deviceDescription: input.deviceDescription || null,
        details: input.details || null,
        startsAt,
        endsAt,
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }

  async updateStatus(tenantId: string, id: string, status: AppointmentStatus) {
    const appointment = await this.prisma.appointment.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');
    return this.prisma.appointment.update({
      where: { id }, data: { status },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }
}
