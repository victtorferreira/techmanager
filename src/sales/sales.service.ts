import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SaleInput = {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  customerId?: string;
  notes?: string;
};

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.sale.findMany({
      where: { tenantId },
      include: { customer: true, seller: { select: { name: true } }, items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(tenantId: string, sellerId: string, input: SaleInput) {
    if (input.items.length === 0) throw new BadRequestException('Adicione pelo menos um produto.');
    const ids = input.items.map(item => item.productId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Cada produto deve aparecer uma única vez na venda.');

    return this.prisma.$transaction(async tx => {
      if (input.customerId) {
        const customer = await tx.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { id: true } });
        if (!customer) throw new BadRequestException('Cliente não pertence a esta assistência.');
      }

      const products = await tx.product.findMany({
        where: { tenantId, active: true, id: { in: ids } },
      });
      if (products.length !== ids.length) throw new BadRequestException('Um ou mais produtos não estão disponíveis.');

      const byId = new Map(products.map(product => [product.id, product]));
      let subtotal = new Prisma.Decimal(0);
      const lines = input.items.map(item => {
        const product = byId.get(item.productId)!;
        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(`Estoque insuficiente para ${product.name}. Disponível: ${product.stockQuantity}.`);
        }
        const unitPrice = new Prisma.Decimal(product.salePrice.toString());
        const total = unitPrice.mul(item.quantity);
        subtotal = subtotal.plus(total);
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unitPrice,
          unitCost: new Prisma.Decimal(product.costPrice.toString()),
          quantity: item.quantity,
          total,
        };
      });

      await tx.$queryRaw`WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${tenantId}))) SELECT 1 FROM lock`;
      const last = await tx.sale.findFirst({ where: { tenantId }, orderBy: { number: 'desc' }, select: { number: true } });
      const number = (last?.number ?? 0) + 1;

      const balances = new Map<string, number>();
      for (const item of [...input.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
        const update = await tx.product.updateMany({
          where: { id: item.productId, tenantId, active: true, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (update.count !== 1) throw new BadRequestException('O estoque mudou durante a venda. Atualize e tente novamente.');
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        balances.set(item.productId, product.stockQuantity);
      }

      const sale = await tx.sale.create({
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
      await tx.stockMovement.createMany({ data: lines.map(line => ({
        tenantId, productId: line.productId, productName: line.productName, type: 'SALE' as const,
        quantity: -line.quantity, balanceAfter: balances.get(line.productId)!, unitCost: line.unitCost,
        saleId: sale.id, createdById: sellerId,
      })) });
      return sale;
    });
  }
}
