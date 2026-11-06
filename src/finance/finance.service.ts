import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinanceEntryStatus, FinanceEntryType, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { lockFinance, shopDate, syncOrderBalance } from './integration';

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
        include: { createdBy: { select: { name: true } }, reversal: { select: { id: true } }, stockMovement: { select: { supplierId: true } }, reversalOf: { select: { stockMovement: { select: { supplierId: true } } } } },
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
          source: entry.stockMovementId ? 'PURCHASE' as const : entry.serviceOrderId ? 'SERVICE_ORDER' as const : entry.reversalOfId ? 'REVERSAL' as const : 'MANUAL' as const,
          serviceOrderId: entry.serviceOrderId,
          supplierId: entry.stockMovement?.supplierId ?? entry.reversalOf?.stockMovement?.supplierId,
          dueAt: entry.dueAt,
          reversed: Boolean(entry.reversal),
          reversalOfId: entry.reversalOfId,
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

  async updateStatus(tenantId: string, id: string, status: FinanceEntryStatus, paymentMethod?: PaymentMethod, paidAt?: string) {
    return this.prisma.$transaction(async tx => {
      await lockFinance(tx, tenantId);
      const entry = await tx.financialEntry.findFirst({ where: { id, tenantId }, include: { reversal: true } });
      if (!entry) throw new NotFoundException('Lançamento financeiro não encontrado.');
      if (entry.status === 'CANCELED') {
        if (status === 'CANCELED') return entry;
        throw new BadRequestException('Um lançamento cancelado não pode ser quitado.');
      }
      if (entry.reversalOfId) throw new BadRequestException('Estornos não podem ser alterados.');
      if (status === 'PAID') {
        if (entry.status === 'PAID') return entry;
        const method = paymentMethod ?? entry.paymentMethod;
        if (!method) throw new BadRequestException('Informe a forma de pagamento.');
        const updated = await tx.financialEntry.update({ where: { id }, data: {
          status: 'PAID', paymentMethod: method, occurredAt: paidAt ? shopDate(paidAt) : new Date(),
          // Release the unique balance key: this entry is now an actual receipt.
          ...(entry.serviceOrderId ? { sourceKey: null } : {}),
        } });
        if (entry.serviceOrderId) await syncOrderBalance(tx, tenantId, entry.serviceOrderId);
        return updated;
      }
      if (entry.reversal) return entry.reversal;
      if (entry.serviceOrderId && entry.status === 'PENDING') throw new BadRequestException('Cancele a cobrança pela ordem de serviço.');
      if (entry.stockMovementId) {
        const purchase = await tx.stockMovement.findFirst({ where: { id: entry.stockMovementId, tenantId } });
        if (!purchase) throw new NotFoundException('Compra não encontrada.');
        if (!purchase.canceledAt) {
          const result = await tx.product.updateMany({ where: { tenantId, id: purchase.productId, stockQuantity: { gte: purchase.quantity } }, data: { stockQuantity: { decrement: purchase.quantity } } });
          if (!result.count) throw new BadRequestException('Estoque insuficiente para cancelar a compra. Devolva as peças utilizadas primeiro.');
          const product = await tx.product.findUniqueOrThrow({ where: { id: purchase.productId } });
          await tx.stockMovement.create({ data: {
            tenantId, productId: purchase.productId, productName: purchase.productName, type: 'ADJUSTMENT',
            quantity: -purchase.quantity, balanceAfter: product.stockQuantity, unitCost: purchase.unitCost,
            notes: `Cancelamento da compra ${purchase.id}`,
          } });
          await tx.stockMovement.update({ where: { id: purchase.id }, data: { canceledAt: new Date() } });
          const last = await tx.stockMovement.findFirst({ where: { tenantId, productId: purchase.productId, type: 'PURCHASE', canceledAt: null }, orderBy: [{ occurredAt: 'desc' }, { sequence: 'desc' }] });
          await tx.product.update({ where: { id: product.id }, data: { purchaseDate: last?.occurredAt ?? null, ...(last ? { supplierId: last.supplierId, costPrice: last.unitCost } : {}) } });
        }
      }
      if (entry.status === 'PAID') {
        const reversal = await tx.financialEntry.create({ data: {
          tenantId, serviceOrderId: entry.serviceOrderId, reversalOfId: entry.id, sourceKey: `reversal:${entry.id}`,
          type: entry.type === 'INCOME' ? 'EXPENSE' : 'INCOME', status: 'PAID', category: 'Estorno',
          description: `Estorno · ${entry.description}`, amount: entry.amount,
          paymentMethod: paymentMethod ?? entry.paymentMethod, occurredAt: paidAt ? shopDate(paidAt) : new Date(),
        } });
        if (entry.serviceOrderId) await syncOrderBalance(tx, tenantId, entry.serviceOrderId);
        return reversal;
      }
      return tx.financialEntry.update({ where: { id }, data: { status: 'CANCELED' } });
    });
  }
}
