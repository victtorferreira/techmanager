import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerClassification, CustomerPriceTable, CustomerType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CustomerData = {
  name?: string;
  customerType?: CustomerType;
  photoData?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  whatsappSameAsPhone?: boolean;
  email?: string | null;
  document?: string | null;
  dateOfBirth?: string | null;
  zipCode?: string | null;
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  addressReference?: string | null;
  deliveryRoute?: string | null;
  isTaxPayer?: boolean | null;
  stateRegistration?: string | null;
  cityIbgeCode?: string | null;
  municipalRegistration?: string | null;
  invoiceEmail?: string | null;
  classification?: CustomerClassification;
  active?: boolean;
  creditLimit?: number;
  priceTable?: CustomerPriceTable;
  discountPercent?: number;
  notes?: string | null;
};

function customerWriteData<T extends Prisma.CustomerUncheckedCreateInput | Prisma.CustomerUncheckedUpdateInput>(data: CustomerData): T {
  const { dateOfBirth, creditLimit, discountPercent, ...fields } = data;
  return {
    ...fields,
    ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth.slice(0, 10)}T12:00:00.000Z`) : null } : {}),
    ...(creditLimit !== undefined ? { creditLimit: new Prisma.Decimal(creditLimit) } : {}),
    ...(discountPercent !== undefined ? { discountPercent: new Prisma.Decimal(discountPercent) } : {}),
  } as T;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}
  list(tenantId: string) {
    return this.prisma.customer.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  create(tenantId: string, data: CustomerData & { name: string }) {
    return this.prisma.customer.create({ data: { ...customerWriteData<Prisma.CustomerUncheckedCreateInput>(data), tenantId } });
  }
  async find(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { tenantId, id } });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    return customer;
  }

  async update(tenantId: string, id: string, data: CustomerData) {
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    return this.prisma.customer.update({ where: { id }, data: customerWriteData<Prisma.CustomerUncheckedUpdateInput>(data) });
  }
}
