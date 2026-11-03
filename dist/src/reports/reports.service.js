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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const money = (value) => Number(value);
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async summary(tenantId, fromValue, toValue) {
        const from = new Date(fromValue);
        const to = new Date(toValue);
        if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) {
            throw new common_1.BadRequestException('Informe um período válido.');
        }
        if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
            throw new common_1.BadRequestException('O período máximo do relatório é de 12 meses.');
        }
        const range = { gte: from, lt: to };
        const [sales, expenses, orders, customers, appointments, stockProducts, topItems] = await Promise.all([
            this.prisma.sale.findMany({ where: { tenantId, createdAt: range }, include: { items: true } }),
            this.prisma.financialEntry.findMany({ where: { tenantId, occurredAt: range, status: client_1.FinanceEntryStatus.PAID } }),
            this.prisma.serviceOrder.findMany({ where: { tenantId, createdAt: range }, select: { status: true } }),
            this.prisma.customer.count({ where: { tenantId, createdAt: range } }),
            this.prisma.appointment.findMany({ where: { tenantId, startsAt: range }, select: { status: true, startsAt: true } }),
            this.prisma.product.findMany({ where: { tenantId, active: true }, select: { stockQuantity: true, minimumStock: true } }),
            this.prisma.saleItem.groupBy({
                by: ['productId', 'productName'],
                where: { sale: { tenantId, createdAt: range } },
                _sum: { quantity: true, total: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5,
            }),
        ]);
        const buckets = new Map();
        const keyFor = (date) => {
            const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
            return local.toISOString().slice(0, 10);
        };
        const ensureBucket = (date) => {
            const key = keyFor(date);
            if (!buckets.has(key))
                buckets.set(key, { date: key, sales: 0, expenses: 0, appointments: 0 });
            return buckets.get(key);
        };
        const cursor = new Date(from);
        cursor.setHours(0, 0, 0, 0);
        const last = new Date(to);
        last.setHours(0, 0, 0, 0);
        for (let i = 0; cursor < last && i < 367; i++, cursor.setDate(cursor.getDate() + 1))
            ensureBucket(cursor);
        for (const sale of sales)
            ensureBucket(sale.createdAt).sales += money(sale.total);
        for (const entry of expenses)
            if (entry.type === client_1.FinanceEntryType.EXPENSE)
                ensureBucket(entry.occurredAt).expenses += money(entry.amount);
        for (const appointment of appointments)
            ensureBucket(appointment.startsAt).appointments++;
        const statusCounts = orders.reduce((counts, order) => {
            counts[order.status] = (counts[order.status] ?? 0) + 1;
            return counts;
        }, {});
        const appointmentCounts = appointments.reduce((counts, appointment) => {
            counts[appointment.status] = (counts[appointment.status] ?? 0) + 1;
            return counts;
        }, {});
        const salesTotal = sales.reduce((sum, sale) => sum + money(sale.total), 0);
        const grossProfit = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + (money(item.unitPrice) - money(item.unitCost)) * item.quantity, 0), 0);
        const income = salesTotal + expenses.filter(entry => entry.type === client_1.FinanceEntryType.INCOME).reduce((sum, entry) => sum + money(entry.amount), 0);
        const expenseTotal = expenses.filter(entry => entry.type === client_1.FinanceEntryType.EXPENSE).reduce((sum, entry) => sum + money(entry.amount), 0);
        const lowStock = stockProducts.filter(product => product.stockQuantity <= product.minimumStock).length;
        return {
            totals: {
                sales: salesTotal,
                saleCount: sales.length,
                averageTicket: sales.length ? salesTotal / sales.length : 0,
                grossProfit,
                income,
                expenses: expenseTotal,
                balance: income - expenseTotal,
                orders: orders.length,
                newCustomers: customers,
                appointments: appointments.length,
                completedAppointments: appointmentCounts.COMPLETED ?? 0,
                lowStock,
            },
            series: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)),
            ordersByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
            appointmentsByStatus: Object.entries(appointmentCounts).map(([status, count]) => ({ status, count })),
            topProducts: topItems.map(item => ({ id: item.productId, name: item.productName, quantity: item._sum.quantity ?? 0, total: money(item._sum.total ?? 0) })),
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map