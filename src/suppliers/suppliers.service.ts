import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierDto, SupplierQueryDto } from './suppliers.dto';

function writeData(input: SupplierDto) {
  const optional = (value?: string | null) => value?.trim() || null;
  return {
    name: input.name.trim(), tradeName: optional(input.tradeName),
    document: optional(input.document)?.replace(/[.\s/()-]/g, '') || null,
    contactName: optional(input.contactName), phone: optional(input.phone), whatsapp: optional(input.whatsapp),
    email: optional(input.email)?.toLowerCase() || null, address: optional(input.address),
    city: optional(input.city), state: optional(input.state)?.toUpperCase() || null,
    paymentTerms: optional(input.paymentTerms), notes: optional(input.notes), active: input.active,
  };
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: SupplierQueryDto) {
    const search = query.search?.trim();
    const digits = search?.replace(/\D/g, '');
    const where: Prisma.SupplierWhereInput = {
      tenantId,
      ...(query.status === 'active' ? { active: true } : query.status === 'inactive' ? { active: false } : {}),
      ...(search ? { OR: [
        ...['name', 'tradeName', 'contactName', 'email', 'city'].map(key => ({ [key]: { contains: search, mode: 'insensitive' as const } })),
        ...(digits ? [{ document: { contains: digits } }] : []),
      ] } : {}),
    };
    const page = query.page ?? 1;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20 }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total, page, pageSize: 20 };
  }

  private handleError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Já existe um fornecedor com este CPF/CNPJ nesta assistência.');
    }
    throw error;
  }

  async create(tenantId: string, input: SupplierDto) {
    try {
      return await this.prisma.supplier.create({ data: { ...writeData(input), tenantId } });
    } catch (error) { this.handleError(error); }
  }

  async update(tenantId: string, id: string, input: SupplierDto) {
    try {
      return await this.prisma.$transaction(async tx => {
        const result = await tx.supplier.updateMany({ where: { tenantId, id }, data: writeData(input) });
        if (!result.count) throw new NotFoundException('Fornecedor não encontrado.');
        return tx.supplier.findFirst({ where: { tenantId, id } });
      });
    } catch (error) { this.handleError(error); }
  }

  async remove(tenantId: string, id: string) {
    try {
      const result = await this.prisma.supplier.deleteMany({ where: { tenantId, id } });
      if (!result.count) throw new NotFoundException('Fornecedor não encontrado.');
      return { deleted: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Este fornecedor possui produtos ou compras vinculadas. Marque-o como inativo para preservar o histórico.');
      }
      throw error;
    }
  }
}
