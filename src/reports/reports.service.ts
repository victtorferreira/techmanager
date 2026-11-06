import { BadRequestException, Injectable } from '@nestjs/common';
import { FinanceEntryStatus, FinanceEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const money = (value: Prisma.Decimal | number) => Number(value);

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async summary(tenantId: string, fromValue: string, toValue: string) {
    const from = new Date(fromValue);
    const to = new Date(toValue);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) {
      throw new BadRequestException('Informe um período válido.');
    }
    if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('O período máximo do relatório é de 12 meses.');
    }
    const range = { gte: from, lt: to };
    const [sales, entries, orders, customers, appointments, stockProducts, topItems, purchases] = await Promise.all([
      this.prisma.sale.findMany({ where: { tenantId, createdAt: range }, include: { items: true } }),
      this.prisma.financialEntry.findMany({ where: { tenantId, occurredAt: range }, include: {
        stockMovement: { select: { supplierId: true, supplierName: true } },
        reversalOf: { select: { stockMovement: { select: { supplierId: true, supplierName: true } } } },
      } }),
      this.prisma.serviceOrder.findMany({ where: { tenantId, createdAt: range }, include: { stockMovements: { where: { type: { in: ['SERVICE_ORDER', 'RETURN'] } } } } }),
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
      this.prisma.stockMovement.findMany({ where: { tenantId, type: 'PURCHASE', canceledAt: null, occurredAt: range }, select: { supplierId: true, supplierName: true, quantity: true, unitCost: true } }),
    ]);
    const expenses = entries.filter(entry => entry.status === FinanceEntryStatus.PAID);

    // Bucket by calendar day in the shop's local time zone as represented by the date range.
    const buckets = new Map<string, { date: string; sales: number; income: number; expenses: number; appointments: number }>();
    const keyFor = (date: Date) => {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    };
    const ensureBucket = (date: Date) => {
      const key = keyFor(date);
      if (!buckets.has(key)) buckets.set(key, { date: key, sales: 0, income: 0, expenses: 0, appointments: 0 });
      return buckets.get(key)!;
    };
    for (let instant = from.getTime(), i = 0; instant < to.getTime() && i < 367; i++, instant += 86400000) ensureBucket(new Date(instant));
    for (const sale of sales) { ensureBucket(sale.createdAt).sales += money(sale.total); ensureBucket(sale.createdAt).income += money(sale.total); }
    for (const entry of expenses) {
      if (entry.type === FinanceEntryType.EXPENSE) ensureBucket(entry.occurredAt).expenses += money(entry.amount);
      else ensureBucket(entry.occurredAt).income += money(entry.amount);
    }
    for (const appointment of appointments) ensureBucket(appointment.startsAt).appointments++;

    const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
      return counts;
    }, {});
    const appointmentCounts = appointments.reduce<Record<string, number>>((counts, appointment) => {
      counts[appointment.status] = (counts[appointment.status] ?? 0) + 1;
      return counts;
    }, {});
    const salesTotal = sales.reduce((sum, sale) => sum + money(sale.total), 0);
    const grossProfit = sales.reduce((sum, sale) => sum + sale.items.reduce(
      (itemSum, item) => itemSum + (money(item.unitPrice) - money(item.unitCost)) * item.quantity, 0,
    ), 0);
    const income = salesTotal + expenses.filter(entry => entry.type === FinanceEntryType.INCOME).reduce((sum, entry) => sum + money(entry.amount), 0);
    const expenseTotal = expenses.filter(entry => entry.type === FinanceEntryType.EXPENSE).reduce((sum, entry) => sum + money(entry.amount), 0);
    const lowStock = stockProducts.filter(product => product.stockQuantity <= product.minimumStock).length;
    const serviceIncome = expenses.filter(e => e.serviceOrderId && e.type === 'INCOME').reduce((sum, e) => sum + money(e.amount), 0);
    const serviceRefunds = expenses.filter(e => e.serviceOrderId && e.type === 'EXPENSE').reduce((sum, e) => sum + money(e.amount), 0);
    const activeOrders = orders.filter(o => !['CANCELED', 'NO_REPAIR'].includes(o.status));
    const servicePartsCost = activeOrders.reduce((sum, o) => sum + o.stockMovements.reduce((cost, m) => cost - money(m.unitCost) * m.quantity, 0), 0);
    const serviceQuoted = activeOrders.reduce((sum, o) => sum + money(o.totalAmount), 0);
    const suppliers = new Map<string, { id: string; name: string; purchases: number; purchased: number; paid: number }>();
    const supplierBucket = (id: string | null, name: string | null) => {
      const key = id ?? 'unknown';
      if (!suppliers.has(key)) suppliers.set(key, { id: key, name: name ?? 'Fornecedor', purchases: 0, purchased: 0, paid: 0 });
      return suppliers.get(key)!;
    };
    for (const p of purchases) { const group = supplierBucket(p.supplierId, p.supplierName); group.purchases++; group.purchased += money(p.unitCost) * p.quantity; }
    for (const e of expenses) {
      const source = e.stockMovement ?? e.reversalOf?.stockMovement;
      if (source) supplierBucket(source.supplierId, source.supplierName).paid += money(e.amount) * (e.type === 'EXPENSE' ? 1 : -1);
    }

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
        serviceIncome, serviceRefunds, serviceQuoted, servicePartsCost, serviceResult: serviceQuoted - servicePartsCost,
        purchases: purchases.reduce((sum, p) => sum + money(p.unitCost) * p.quantity, 0),
        pendingIncome: entries.filter(e => e.status === 'PENDING' && e.type === 'INCOME').reduce((sum, e) => sum + money(e.amount), 0),
        pendingExpenses: entries.filter(e => e.status === 'PENDING' && e.type === 'EXPENSE').reduce((sum, e) => sum + money(e.amount), 0),
      },
      series: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)),
      suppliers: [...suppliers.values()].sort((a, b) => b.purchased - a.purchased),
      ordersByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      appointmentsByStatus: Object.entries(appointmentCounts).map(([status, count]) => ({ status, count })),
      topProducts: topItems.map(item => ({ id: item.productId, name: item.productName, quantity: item._sum.quantity ?? 0, total: money(item._sum.total ?? 0) })),
    };
  }
}
