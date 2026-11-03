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
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let FinanceService = class FinanceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async summary(tenantId, from, to) {
        const range = { gte: new Date(from), lt: new Date(to) };
        const [sales, manualEntries] = await Promise.all([
            this.prisma.sale.findMany({
                where: { tenantId, createdAt: range },
                include: { customer: { select: { name: true } }, seller: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.financialEntry.findMany({
                where: { tenantId, occurredAt: range },
                include: { createdBy: { select: { name: true } } },
                orderBy: { occurredAt: 'desc' },
            }),
        ]);
        let income = new client_1.Prisma.Decimal(0);
        let expenses = new client_1.Prisma.Decimal(0);
        let pendingIncome = new client_1.Prisma.Decimal(0);
        let pendingExpenses = new client_1.Prisma.Decimal(0);
        const entries = [
            ...sales.map(sale => {
                income = income.plus(sale.total);
                return {
                    id: `sale:${sale.id}`,
                    type: 'INCOME',
                    status: 'PAID',
                    category: 'Venda de produtos',
                    description: `Venda #${String(sale.number).padStart(5, '0')}${sale.customer ? ` · ${sale.customer.name}` : ''}`,
                    amount: sale.total,
                    paymentMethod: sale.paymentMethod,
                    occurredAt: sale.createdAt,
                    source: 'SALE',
                    createdBy: sale.seller?.name ?? null,
                };
            }),
            ...manualEntries.map(entry => {
                if (entry.status === 'PAID') {
                    if (entry.type === 'INCOME')
                        income = income.plus(entry.amount);
                    else
                        expenses = expenses.plus(entry.amount);
                }
                else if (entry.status === 'PENDING') {
                    if (entry.type === 'INCOME')
                        pendingIncome = pendingIncome.plus(entry.amount);
                    else
                        pendingExpenses = pendingExpenses.plus(entry.amount);
                }
                return {
                    id: entry.id,
                    type: entry.type,
                    status: entry.status,
                    category: entry.category,
                    description: entry.description,
                    amount: entry.amount,
                    paymentMethod: entry.paymentMethod,
                    occurredAt: entry.occurredAt,
                    source: 'MANUAL',
                    createdBy: entry.createdBy?.name ?? null,
                };
            }),
        ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 500);
        return {
            totals: {
                income,
                expenses,
                balance: income.minus(expenses),
                pendingIncome,
                pendingExpenses,
            },
            entries,
        };
    }
    async create(tenantId, createdById, input) {
        const occurredAt = new Date(input.occurredAt);
        if (!Number.isFinite(occurredAt.getTime()))
            throw new common_1.BadRequestException('Informe uma data válida.');
        if (input.status === client_1.FinanceEntryStatus.PAID && !input.paymentMethod) {
            throw new common_1.BadRequestException('Informe a forma de pagamento para um lançamento já pago.');
        }
        return this.prisma.financialEntry.create({
            data: {
                tenantId,
                createdById,
                type: input.type,
                status: input.status,
                category: input.category,
                description: input.description,
                amount: new client_1.Prisma.Decimal(input.amount),
                paymentMethod: input.paymentMethod,
                occurredAt,
            },
        });
    }
    async updateStatus(tenantId, id, status, paymentMethod) {
        const entry = await this.prisma.financialEntry.findFirst({ where: { id, tenantId } });
        if (!entry)
            throw new common_1.NotFoundException('Lançamento financeiro não encontrado.');
        const method = paymentMethod ?? entry.paymentMethod;
        if (status === client_1.FinanceEntryStatus.PAID && !method) {
            throw new common_1.BadRequestException('Informe a forma de pagamento para quitar este lançamento.');
        }
        return this.prisma.financialEntry.update({
            where: { id },
            data: { status, ...(paymentMethod ? { paymentMethod } : {}) },
        });
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map