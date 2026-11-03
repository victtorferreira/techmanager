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
    const [sales, expenses, orders, customers, appointments, stockProducts, topItems] = await Promise.all([
      this.prisma.sale.findMany({ where: { tenantId, createdAt: range }, include: { items: true } }),
      this.prisma.financialEntry.findMany({ where: { tenantId, occurredAt: range, status: FinanceEntryStatus.PAID } }),
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

    // Bucket by calendar day in the shop's local time zone as represented by the date range.
    const buckets = new Map<string, { date: string; sales: number; expenses: number; appointments: number }>();
    const keyFor = (date: Date) => {
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    };
    const ensureBucket = (date: Date) => {
      const key = keyFor(date);
      if (!buckets.has(key)) buckets.set(key, { date: key, sales: 0, expenses: 0, appointments: 0 });
      return buckets.get(key)!;
    };
    const cursor = new Date(from); cursor.setHours(0, 0, 0, 0);
    const last = new Date(to); last.setHours(0, 0, 0, 0);
    for (let i = 0; cursor < last && i < 367; i++, cursor.setDate(cursor.getDate() + 1)) ensureBucket(cursor);
    for (const sale of sales) ensureBucket(sale.createdAt).sales += money(sale.total);
    for (const entry of expenses) if (entry.type === FinanceEntryType.EXPENSE) ensureBucket(entry.occurredAt).expenses += money(entry.amount);
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
}
