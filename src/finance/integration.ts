import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';

export type PurchasePayment = { status?: 'PENDING' | 'PAID'; paymentMethod?: PaymentMethod; dueAt?: string; paidAt?: string };
export const shopDate = (value: string) => new Date(`${value}T12:00:00-03:00`);
export async function lockFinance(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$queryRaw`WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${tenantId}))) SELECT 1 FROM lock`;
}
export async function recordPurchase(tx: Prisma.TransactionClient, movement: { id: string; tenantId: string; quantity: number; unitCost: Prisma.Decimal; productName: string; supplierName: string | null; occurredAt: Date; createdById: string | null }, payment: PurchasePayment | null = {}) {
  payment ??= {};
  const status = payment.status ?? 'PENDING';
  const amount = movement.unitCost.mul(movement.quantity);
  if (amount.gt('9999999999.99')) throw new BadRequestException('O total da compra excede o limite financeiro.');
  if (status === 'PAID' && (!payment.paymentMethod || !payment.paidAt)) throw new BadRequestException('Informe a forma e a data do pagamento da compra.');
  if (amount.isZero()) return;
  return tx.financialEntry.create({ data: {
    tenantId: movement.tenantId, createdById: movement.createdById,
    stockMovementId: movement.id, sourceKey: `purchase:${movement.id}`,
    type: 'EXPENSE', status, category: 'Compra de peças',
    description: `${movement.productName} · ${movement.supplierName ?? 'Fornecedor'} (${movement.quantity} un.)`,
    amount, paymentMethod: payment.paymentMethod,
    dueAt: payment.dueAt ? shopDate(payment.dueAt) : movement.occurredAt,
    occurredAt: status === 'PAID' ? shopDate(payment.paidAt!) : payment.dueAt ? shopDate(payment.dueAt) : movement.occurredAt,
  } });
}
export async function syncOrderBalance(tx: Prisma.TransactionClient, tenantId: string, orderId: string) {
  const order = await tx.serviceOrder.findFirst({ where: { tenantId, id: orderId } });
  if (!order) throw new NotFoundException('Ordem de serviço não encontrada.');
  const entries = await tx.financialEntry.findMany({ where: { tenantId, serviceOrderId: orderId, status: 'PAID' } });
  const received = entries.reduce((sum, e) => e.type === 'INCOME' ? sum.plus(e.amount) : sum.minus(e.amount), new Prisma.Decimal(0));
  const remaining = order.totalAmount.minus(received);
  if (received.isNegative() || remaining.isNegative()) throw new BadRequestException('O valor da OS não pode ser menor que o valor já recebido. Estorne o recebimento primeiro.');
  const closed = ['CANCELED', 'NO_REPAIR'].includes(order.status);
  const sourceKey = `order:${order.id}:balance`;
  if (!closed && remaining.gt(0)) {
    await tx.financialEntry.upsert({ where: { sourceKey }, create: {
      tenantId, serviceOrderId: orderId, sourceKey, type: 'INCOME', status: 'PENDING', category: 'Ordem de serviço',
      description: `OS #${String(order.number).padStart(5, '0')} · saldo a receber`, amount: remaining,
      occurredAt: order.estimatedDelivery ?? new Date(), dueAt: order.estimatedDelivery,
    }, update: { amount: remaining, status: 'PENDING', ...(order.estimatedDelivery ? { occurredAt: order.estimatedDelivery, dueAt: order.estimatedDelivery } : {}) } });
  } else {
    await tx.financialEntry.updateMany({ where: { tenantId, sourceKey, status: 'PENDING' }, data: { status: 'CANCELED' } });
  }
  await tx.serviceOrder.update({ where: { id: orderId }, data: {
    paymentStatus: received.isZero() ? entries.some(e => e.type === 'EXPENSE') ? 'REFUNDED' : 'PENDING' : remaining.isZero() ? 'PAID' : 'PARTIAL',
  } });
  return { received, remaining };
}
