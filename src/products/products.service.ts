import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}
  list(tenantId: string) {
    return this.prisma.product.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' }, take: 200 });
  }
  create(tenantId: string, data: { name: string; sku?: string; category?: string; costPrice: number; salePrice: number; stockQuantity?: number; minimumStock?: number }) {
    return this.prisma.product.create({ data: { ...data, tenantId } });
  }
}
