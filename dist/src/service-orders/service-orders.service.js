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
exports.ServiceOrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ServiceOrdersService = class ServiceOrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async nextNumber(tx, tenantId) {
        await tx.$queryRaw `WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${tenantId}))) SELECT 1 FROM lock`;
        const last = await tx.serviceOrder.findFirst({
            where: { tenantId }, orderBy: { number: 'desc' }, select: { number: true },
        });
        return (last?.number ?? 0) + 1;
    }
    async publicTenant(slug) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug }, select: { name: true, phone: true, slug: true },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Assistência não encontrada.');
        return tenant;
    }
    async createPublicRequest(slug, input) {
        const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true, name: true } });
        if (!tenant)
            throw new common_1.NotFoundException('Assistência não encontrada.');
        if (input.preferredContact === 'EMAIL' && !input.email) {
            throw new common_1.BadRequestException('Informe um e-mail para receber contato por e-mail.');
        }
        const phone = input.phone.replace(/[^\d+]/g, '');
        const created = await this.prisma.$transaction(async (tx) => {
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
    list(tenantId) {
        return this.prisma.serviceOrder.findMany({
            where: { tenantId },
            include: { customer: true, device: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async create(tenantId, data) {
        return this.prisma.$transaction(async (tx) => {
            const [customer, device] = await Promise.all([
                tx.customer.findFirst({ where: { id: data.customerId, tenantId } }),
                tx.device.findFirst({ where: { id: data.deviceId, tenantId, customerId: data.customerId } }),
            ]);
            if (!customer || !device)
                throw new common_1.BadRequestException('Cliente ou aparelho não pertence a esta assistência.');
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
};
exports.ServiceOrdersService = ServiceOrdersService;
exports.ServiceOrdersService = ServiceOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServiceOrdersService);
//# sourceMappingURL=service-orders.service.js.map