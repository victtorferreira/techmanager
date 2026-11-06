import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, MovementDto, ProductDto, PurchaseQueryDto } from './products.dto';
import { lockFinance, recordPurchase, shopDate } from '../finance/integration';
import { createHash } from 'node:crypto';

function requestHash(value: unknown): string {
  const canonical = (item: any): any => item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, canonical(item[key])])) : item;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

const movementInclude = { financialEntry: { select: { id: true, status: true, dueAt: true } }, supplier: { select: { name: true } }, serviceOrder: { select: { number: true } }, sale: { select: { number: true } }, createdBy: { select: { name: true } } };
function productData(data: ProductDto) {
  return { name: data.name.trim(), sku: data.sku?.trim() || null, category: data.category?.trim() || null,
    compatibility: data.compatibility?.trim() || null, quality: data.quality?.trim() || null,
    location: data.location?.trim() || null, supplierId: data.supplierId || null,
    costPrice: data.costPrice, salePrice: data.salePrice, minimumStock: data.minimumStock ?? undefined, active: data.active ?? undefined };
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}
  list(tenantId: string) {
    return this.prisma.product.findMany({ where: { tenantId }, include: { supplier: { select: { name: true } } }, orderBy: { name: 'asc' } });
  }
  orderOptions(tenantId: string) {
    return this.prisma.serviceOrder.findMany({ where: { tenantId }, select: { id: true, number: true, customer: { select: { name: true } } }, orderBy: { number: 'desc' } });
  }
  private async supplier(tx: Prisma.TransactionClient, tenantId: string, id?: string | null) {
    if (!id) return null;
    const row = await tx.supplier.findFirst({ where: { id, tenantId } });
    if (!row) throw new BadRequestException('Fornecedor não encontrado nesta assistência.');
    return row;
  }
  private handleError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Já existe um produto com este SKU.');
    throw error;
  }
  async create(tenantId: string, data: CreateProductDto, createdById?: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        await lockFinance(tx, tenantId);
        const requestKey = data.requestId ? `initial:${tenantId}:${data.requestId}` : null;
        const hash = requestHash(data);
        if (requestKey) {
          const previous = await tx.stockMovement.findUnique({ where: { requestKey } });
          if (previous) {
            if (previous.requestHash !== hash) throw new BadRequestException('Identificador de registro já utilizado com outros dados.');
            return tx.product.findFirst({ where: { tenantId, id: previous.productId } });
          }
        }
        const supplier = await this.supplier(tx, tenantId, data.supplierId);
        const quantity = data.stockQuantity ?? 0;
        if (data.purchaseDate && (!supplier || !quantity)) throw new BadRequestException('Informe fornecedor e quantidade inicial para registrar a compra.');
        if (quantity > 0 && supplier && !data.purchaseDate) throw new BadRequestException('Informe a data da compra inicial.');
        const product = await tx.product.create({ data: { ...productData(data), tenantId, stockQuantity: quantity, purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null } });
        if (quantity) {
          const movement = await tx.stockMovement.create({ data: {
          requestKey, requestHash: hash,
          tenantId, productId: product.id, productName: product.name, createdById,
          type: supplier ? 'PURCHASE' : 'INITIAL', quantity, balanceAfter: quantity, unitCost: product.costPrice,
          supplierId: supplier?.id, supplierName: supplier?.name,
          ...(data.purchaseDate ? { occurredAt: shopDate(data.purchaseDate) } : {}),
          notes: supplier ? 'Compra no cadastro inicial.' : 'Saldo inicial do cadastro.',
        } });
        if (supplier) await recordPurchase(tx, movement, data.payment);
        }
        return product;
      });
    } catch (error) { this.handleError(error); }
  }
  async update(tenantId: string, id: string, data: ProductDto) {
    try {
      return await this.prisma.$transaction(async tx => {
        await this.supplier(tx, tenantId, data.supplierId);
        const result = await tx.product.updateMany({ where: { tenantId, id }, data: productData(data) });
        if (!result.count) throw new NotFoundException('Produto não encontrado.');
        return tx.product.findFirst({ where: { tenantId, id } });
      });
    } catch (error) { this.handleError(error); }
  }
  async history(tenantId: string, productId: string, page = 1) {
    if (!await this.prisma.product.findFirst({ where: { tenantId, id: productId }, select: { id: true } })) throw new NotFoundException('Produto não encontrado.');
    const where = { tenantId, productId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({ where, include: movementInclude, orderBy: { sequence: 'desc' }, skip: (page - 1) * 30, take: 30 }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return { items, total, page, pageSize: 30 };
  }
  async move(tenantId: string, productId: string, input: MovementDto, createdById?: string) {
    if (!input.quantity || (!['ADJUSTMENT', 'WARRANTY'].includes(input.type) && input.quantity < 0)) throw new BadRequestException('Informe uma quantidade positiva. Ajustes e garantias aceitam quantidades negativas para saída.');
    if (input.type === 'PURCHASE' && (!input.supplierId || input.unitCost == null || !input.occurredAt)) throw new BadRequestException('Informe fornecedor, custo unitário e data da compra.');
    if (input.type === 'SERVICE_ORDER' && !input.serviceOrderId) throw new BadRequestException('Selecione a ordem de serviço de destino.');
    if (['ADJUSTMENT', 'LOSS', 'WARRANTY'].includes(input.type) && !input.notes?.trim()) throw new BadRequestException('Informe o motivo da movimentação.');
    if (input.type !== 'PURCHASE' && input.supplierId) throw new BadRequestException('Fornecedor só deve ser informado em compras.');
    return this.prisma.$transaction(async tx => {
      await lockFinance(tx, tenantId);
      const requestKey = input.requestId ? `movement:${tenantId}:${input.requestId}` : null;
      const hash = requestHash({ productId, ...input });
      if (requestKey) {
        const previous = await tx.stockMovement.findUnique({ where: { requestKey } });
        if (previous) {
          if (previous.requestHash !== hash) throw new BadRequestException('Identificador de movimentação já utilizado com outros dados.');
          return previous;
        }
      }
      const product = await tx.product.findFirst({ where: { tenantId, id: productId, active: true } });
      if (!product) throw new NotFoundException('Produto ativo não encontrado.');
      const supplier = await this.supplier(tx, tenantId, input.supplierId);
      if (input.payment && input.type !== 'PURCHASE') throw new BadRequestException('Pagamento só deve ser informado em compras.');
      if (input.serviceOrderId) {
        const order = await tx.serviceOrder.findFirst({ where: { tenantId, id: input.serviceOrderId } });
        if (!order) throw new BadRequestException('Ordem de serviço não encontrada nesta assistência.');
        if (['CANCELED', 'NO_REPAIR', 'DELIVERED'].includes(order.status)) throw new BadRequestException('Esta OS está encerrada e não aceita movimentações.');
        if (!['SERVICE_ORDER', 'RETURN'].includes(input.type)) throw new BadRequestException('Vincule à OS somente consumo ou devolução de peças.');
        if (input.type === 'RETURN') {
          const previous = await tx.stockMovement.findMany({ where: { tenantId, productId, serviceOrderId: input.serviceOrderId, type: { in: ['SERVICE_ORDER', 'RETURN'] } } });
          const consumed = -previous.reduce((sum, row) => sum + row.quantity, 0);
          if (input.quantity > consumed) throw new BadRequestException('A devolução excede as peças utilizadas nesta OS.');
        }
      }
      const quantity = ['SERVICE_ORDER', 'LOSS'].includes(input.type) ? -input.quantity : input.quantity;
      const result = await tx.product.updateMany({
        where: { tenantId, id: productId, active: true, stockQuantity: quantity < 0 ? { gte: -quantity } : { lte: 2147483647 - quantity } },
        data: { stockQuantity: { increment: quantity } },
      });
      if (!result.count) throw new BadRequestException('Saldo insuficiente ou quantidade acima do limite. Atualize o estoque.');
      const updated = await tx.product.findUniqueOrThrow({ where: { id: productId } });
      const occurredAt = input.occurredAt ? shopDate(input.occurredAt) : new Date();
      if (input.type === 'PURCHASE' && (!updated.purchaseDate || occurredAt >= updated.purchaseDate)) await tx.product.update({ where: { id: productId }, data: { supplierId: supplier!.id, costPrice: input.unitCost, purchaseDate: occurredAt } });
      let movementCost = input.type === 'PURCHASE' ? new Prisma.Decimal(input.unitCost!) : updated.costPrice;
      if (input.type === 'RETURN' && input.serviceOrderId) {
        const previous = await tx.stockMovement.findMany({ where: { tenantId, productId, serviceOrderId: input.serviceOrderId, type: { in: ['SERVICE_ORDER', 'RETURN'] } } });
        const netQuantity = -previous.reduce((sum, row) => sum + row.quantity, 0);
        const netCost = previous.reduce((sum, row) => sum.minus(row.unitCost.mul(row.quantity)), new Prisma.Decimal(0));
        movementCost = netCost.div(netQuantity).toDecimalPlaces(2);
      }
      const movement = await tx.stockMovement.create({ data: {
        requestKey, requestHash: hash,
        tenantId, productId, productName: product.name, type: input.type, quantity,
        balanceAfter: updated.stockQuantity, unitCost: movementCost,
        supplierId: supplier?.id, supplierName: supplier?.name, serviceOrderId: input.serviceOrderId,
        createdById, occurredAt, notes: input.notes?.trim() || null,
      } });
      if (input.type === 'PURCHASE') await recordPurchase(tx, movement, input.payment);
      return movement;
    });
  }
  async purchases(tenantId: string, query: PurchaseQueryDto) {
    if (query.from && query.to && query.from > query.to) throw new BadRequestException('O início do período deve ser anterior ao fim.');
    const where: Prisma.StockMovementWhereInput = { tenantId, type: 'PURCHASE', canceledAt: null,
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...((query.from || query.to) ? { occurredAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lt: new Date(new Date(query.to).getTime() + 86400000) } : {}) } } : {}),
    };
    return this.prisma.$transaction(async tx => {
      const records = await tx.stockMovement.findMany({ where, select: { supplierId: true, supplierName: true, quantity: true, unitCost: true } });
      let totalAmount = new Prisma.Decimal(0);
      const groups = new Map<string, { supplierId: string; supplierName: string; quantity: number; totalAmount: Prisma.Decimal; purchases: number }>();
      for (const row of records) {
        const amount = row.unitCost.mul(row.quantity);
        totalAmount = totalAmount.plus(amount);
        const key = row.supplierId!;
        const group = groups.get(key) ?? { supplierId: key, supplierName: row.supplierName ?? '', quantity: 0, totalAmount: new Prisma.Decimal(0), purchases: 0 };
        group.quantity += row.quantity; group.totalAmount = group.totalAmount.plus(amount); group.purchases++;
        groups.set(key, group);
      }
      const page = query.page ?? 1;
      const items = await tx.stockMovement.findMany({ where, include: movementInclude, orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 30, take: 30 });
      return { items, total: records.length, page, pageSize: 30, totalAmount, suppliers: [...groups.values()] };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
