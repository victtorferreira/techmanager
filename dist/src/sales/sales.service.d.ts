import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type SaleInput = {
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    paymentMethod: PaymentMethod;
    customerId?: string;
    notes?: string;
};
export declare class SalesService {
    private prisma;
    constructor(prisma: PrismaService);
    list(tenantId: string): Prisma.PrismaPromise<({
        customer: {
            id: string;
            tenantId: string;
            name: string;
            customerType: import(".prisma/client").$Enums.CustomerType;
            photoData: string | null;
            phone: string | null;
            whatsapp: string | null;
            whatsappSameAsPhone: boolean;
            email: string | null;
            document: string | null;
            dateOfBirth: Date | null;
            zipCode: string | null;
            street: string | null;
            addressNumber: string | null;
            complement: string | null;
            neighborhood: string | null;
            city: string | null;
            state: string | null;
            addressReference: string | null;
            deliveryRoute: string | null;
            isTaxPayer: boolean | null;
            stateRegistration: string | null;
            cityIbgeCode: string | null;
            municipalRegistration: string | null;
            invoiceEmail: string | null;
            classification: import(".prisma/client").$Enums.CustomerClassification;
            active: boolean;
            creditLimit: Prisma.Decimal;
            priceTable: import(".prisma/client").$Enums.CustomerPriceTable;
            discountPercent: Prisma.Decimal;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        seller: {
            name: string;
        } | null;
        items: {
            id: string;
            sku: string | null;
            total: Prisma.Decimal;
            productName: string;
            unitPrice: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            quantity: number;
            productId: string;
            saleId: string;
        }[];
    } & {
        number: number;
        id: string;
        tenantId: string;
        notes: string | null;
        createdAt: Date;
        customerId: string | null;
        sellerId: string | null;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        subtotal: Prisma.Decimal;
        total: Prisma.Decimal;
    })[]>;
    create(tenantId: string, sellerId: string, input: SaleInput): Promise<{
        customer: {
            id: string;
            tenantId: string;
            name: string;
            customerType: import(".prisma/client").$Enums.CustomerType;
            photoData: string | null;
            phone: string | null;
            whatsapp: string | null;
            whatsappSameAsPhone: boolean;
            email: string | null;
            document: string | null;
            dateOfBirth: Date | null;
            zipCode: string | null;
            street: string | null;
            addressNumber: string | null;
            complement: string | null;
            neighborhood: string | null;
            city: string | null;
            state: string | null;
            addressReference: string | null;
            deliveryRoute: string | null;
            isTaxPayer: boolean | null;
            stateRegistration: string | null;
            cityIbgeCode: string | null;
            municipalRegistration: string | null;
            invoiceEmail: string | null;
            classification: import(".prisma/client").$Enums.CustomerClassification;
            active: boolean;
            creditLimit: Prisma.Decimal;
            priceTable: import(".prisma/client").$Enums.CustomerPriceTable;
            discountPercent: Prisma.Decimal;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        seller: {
            name: string;
        } | null;
        items: {
            id: string;
            sku: string | null;
            total: Prisma.Decimal;
            productName: string;
            unitPrice: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            quantity: number;
            productId: string;
            saleId: string;
        }[];
    } & {
        number: number;
        id: string;
        tenantId: string;
        notes: string | null;
        createdAt: Date;
        customerId: string | null;
        sellerId: string | null;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        subtotal: Prisma.Decimal;
        total: Prisma.Decimal;
    }>;
}
export {};
