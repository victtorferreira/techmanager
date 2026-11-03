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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let SalesService = class SalesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(tenantId) {
        return this.prisma.sale.findMany({
            where: { tenantId },
            include: { customer: true, seller: { select: { name: true } }, items: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async create(tenantId, sellerId, input) {
        if (input.items.length === 0)
            throw new common_1.BadRequestException('Adicione pelo menos um produto.');
        const ids = input.items.map(item => item.productId);
        if (new Set(ids).size !== ids.length)
            throw new common_1.BadRequestException('Cada produto deve aparecer uma única vez na venda.');
        return this.prisma.$transaction(async (tx) => {
            if (input.customerId) {
                const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { id: true } });
                if (!customer)
                    throw new common_1.BadRequestException('Cliente não pertence a esta assistência.');
            }
            const products = await tx.product.findMany({
                where: { tenantId, active: true, id: { in: ids } },
            });
            if (products.length !== ids.length)
                throw new common_1.BadRequestException('Um ou mais produtos não estão disponíveis.');
            const byId = new Map(products.map(product => [product.id, product]));
            let subtotal = new client_1.Prisma.Decimal(0);
            const lines = input.items.map(item => {
                const product = byId.get(item.productId);
                if (product.stockQuantity < item.quantity) {
                    throw new common_1.BadRequestException(`Estoque insuficiente para ${product.name}. Disponível: ${product.stockQuantity}.`);
                }
                const unitPrice = new client_1.Prisma.Decimal(product.salePrice.toString());
                const total = unitPrice.mul(item.quantity);
                subtotal = subtotal.plus(total);
                return {
                    productId: product.id,
                    productName: product.name,
                    sku: product.sku,
                    unitPrice,
                    unitCost: new client_1.Prisma.Decimal(product.costPrice.toString()),
                    quantity: item.quantity,
                    total,
                };
            });
            await tx.$queryRaw `WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${tenantId}))) SELECT 1 FROM lock`;
            const last = await tx.sale.findFirst({ where: { tenantId }, orderBy: { number: 'desc' }, select: { number: true } });
            const number = (last?.number ?? 0) + 1;
            for (const item of input.items) {
                const update = await tx.product.updateMany({
                    where: { id: item.productId, tenantId, active: true, stockQuantity: { gte: item.quantity } },
                    data: { stockQuantity: { decrement: item.quantity } },
                });
                if (update.count !== 1)
                    throw new common_1.BadRequestException('O estoque mudou durante a venda. Atualize e tente novamente.');
            }
            return tx.sale.create({
                data: {
                    tenantId,
                    number,
                    sellerId,
                    customerId: input.customerId,
                    paymentMethod: input.paymentMethod,
                    subtotal,
                    total: subtotal,
                    notes: input.notes || null,
                    items: { create: lines },
                },
                include: { customer: true, seller: { select: { name: true } }, items: true },
            });
        });
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesService);
//# sourceMappingURL=sales.service.js.map