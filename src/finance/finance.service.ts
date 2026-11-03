import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinanceEntryStatus, FinanceEntryType, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateEntryInput = {
  type: FinanceEntryType;
  status: FinanceEntryStatus;
  category: string;
  description: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  occurredAt: string;
};

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async summary(tenantId: string, from: string, to: string) {
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

    let income = new Prisma.Decimal(0);
    let expenses = new Prisma.Decimal(0);
    let pendingIncome = new Prisma.Decimal(0);
    let pendingExpenses = new Prisma.Decimal(0);

    const entries = [
      ...sales.map(sale => {
        income = income.plus(sale.total);
        return {
          id: `sale:${sale.id}`,
          type: 'INCOME' as const,
          status: 'PAID' as const,
          category: 'Venda de produtos',
          description: `Venda #${String(sale.number).padStart(5, '0')}${sale.customer ? ` · ${sale.customer.name}` : ''}`,
          amount: sale.total,
          paymentMethod: sale.paymentMethod,
          occurredAt: sale.createdAt,
          source: 'SALE' as const,
          createdBy: sale.seller?.name ?? null,
        };
      }),
      ...manualEntries.map(entry => {
        if (entry.status === 'PAID') {
          if (entry.type === 'INCOME') income = income.plus(entry.amount);
          else expenses = expenses.plus(entry.amount);
        } else if (entry.status === 'PENDING') {
          if (entry.type === 'INCOME') pendingIncome = pendingIncome.plus(entry.amount);
          else pendingExpenses = pendingExpenses.plus(entry.amount);
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
          source: 'MANUAL' as const,
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

  async create(tenantId: string, createdById: string, input: CreateEntryInput) {
    const occurredAt = new Date(input.occurredAt);
    if (!Number.isFinite(occurredAt.getTime())) throw new BadRequestException('Informe uma data válida.');
    if (input.status === FinanceEntryStatus.PAID && !input.paymentMethod) {
      throw new BadRequestException('Informe a forma de pagamento para um lançamento já pago.');
    }
    return this.prisma.financialEntry.create({
      data: {
        tenantId,
        createdById,
        type: input.type,
        status: input.status,
        category: input.category,
        description: input.description,
        amount: new Prisma.Decimal(input.amount),
        paymentMethod: input.paymentMethod,
        occurredAt,
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: FinanceEntryStatus, paymentMethod?: PaymentMethod) {
    const entry = await this.prisma.financialEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Lançamento financeiro não encontrado.');
    const method = paymentMethod ?? entry.paymentMethod;
    if (status === FinanceEntryStatus.PAID && !method) {
      throw new BadRequestException('Informe a forma de pagamento para quitar este lançamento.');
    }
    return this.prisma.financialEntry.update({
      where: { id },
      data: { status, ...(paymentMethod ? { paymentMethod } : {}) },
    });
  }
}
