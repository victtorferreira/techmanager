import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: string) {
    const term = query.trim();
    if (term.length < 2) return { items: [] };
    const contains = { contains: term, mode: 'insensitive' as const };
    const digits = term.replace(/\D/g, '');
    const orderNumber = /^#?\d+$/.test(term) ? Number(term.replace('#', '')) : null;
    const [customers, orders, products, suppliers] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId, OR: [{ name: contains }, { email: contains }, { phone: contains }, { document: contains }, ...(digits ? [{ phone: { contains: digits } }, { document: { contains: digits } }] : [])] }, select: { id: true, name: true, phone: true }, orderBy: { name: 'asc' }, take: 8 }),
      this.prisma.serviceOrder.findMany({ where: { tenantId, OR: [
        ...(orderNumber !== null && orderNumber <= 2147483647 ? [{ number: orderNumber }] : []),
        { customer: { name: contains } }, { device: { model: contains } }, { device: { brand: contains } }, { reportedIssue: contains },
      ] }, select: { id: true, number: true, customer: { select: { name: true } }, device: { select: { brand: true, model: true } } }, orderBy: { number: 'desc' }, take: 8 }),
      this.prisma.product.findMany({ where: { tenantId, OR: [{ name: contains }, { sku: contains }, { compatibility: contains }] }, select: { id: true, name: true, sku: true, stockQuantity: true }, orderBy: { name: 'asc' }, take: 8 }),
      this.prisma.supplier.findMany({ where: { tenantId, OR: [{ name: contains }, { tradeName: contains }, { document: contains }, ...(digits ? [{ document: { contains: digits } }] : [])] }, select: { id: true, name: true, tradeName: true }, orderBy: { name: 'asc' }, take: 8 }),
    ]);
    return { items: [
      ...customers.map(row => ({ id: row.id, kind: 'Cliente', title: row.name, description: row.phone || 'Sem telefone', href: `/clientes/${row.id}` })),
      ...orders.map(row => ({ id: row.id, kind: 'Ordem de serviço', title: `OS #${String(row.number).padStart(5, '0')}`, description: `${row.customer.name} · ${row.device.brand} ${row.device.model}`, href: `/ordens?orderId=${row.id}` })),
      ...products.map(row => ({ id: row.id, kind: 'Produto', title: row.name, description: `${row.sku || 'Sem SKU'} · ${row.stockQuantity} un.`, href: `/produtos?productId=${row.id}` })),
      ...suppliers.map(row => ({ id: row.id, kind: 'Fornecedor', title: row.name, description: row.tradeName || 'Fornecedor cadastrado', href: `/fornecedores?search=${encodeURIComponent(row.name)}` })),
    ] };
  }
}
