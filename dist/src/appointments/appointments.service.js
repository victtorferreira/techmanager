"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AppointmentsService = class AppointmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(tenantId, from, to) {
        const startsAt = {};
        if (from)
            startsAt.gte = new Date(from);
        if (to)
            startsAt.lt = new Date(to);
        return this.prisma.appointment.findMany({
            where: { tenantId, ...(from || to ? { startsAt } : {}) },
            include: { customer: { select: { id: true, name: true, phone: true } } },
            orderBy: { startsAt: 'asc' },
            take: 500,
        });
    }
    async create(tenantId, input) {
        const startsAt = new Date(input.startsAt);
        const endsAt = new Date(input.endsAt);
        if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
            throw new common_1.BadRequestException('O horário de término deve ser posterior ao início.');
        }
        const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { id: true } });
        if (!customer)
            throw new common_1.BadRequestException('Cliente não pertence a esta assistência.');
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
    async updateStatus(tenantId, id, status) {
        const appointment = await this.prisma.appointment.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!appointment)
            throw new common_1.NotFoundException('Agendamento não encontrado.');
        return this.prisma.appointment.update({
            where: { id }, data: { status },
            include: { customer: { select: { id: true, name: true, phone: true } } },
        });
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map