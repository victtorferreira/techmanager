import { PaymentMethod } from '@prisma/client';
import { SalesService } from './sales.service';
declare class SaleLineDto {
    productId: string;
    quantity: number;
}
declare class CreateSaleDto {
    items: SaleLineDto[];
    paymentMethod: PaymentMethod;
    customerId?: string;
    notes?: string;
}
export declare class SalesController {
    private readonly sales;
    constructor(sales: SalesService);
    list(req: any): import(".prisma/client").Prisma.PrismaPromise<({
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
            creditLimit: import("@prisma/client/runtime/library").Decimal;
            priceTable: import(".prisma/client").$Enums.CustomerPriceTable;
            discountPercent: import("@prisma/client/runtime/library").Decimal;
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
            total: import("@prisma/client/runtime/library").Decimal;
            productName: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
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
        subtotal: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    create(req: any, dto: CreateSaleDto): Promise<{
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
            creditLimit: import("@prisma/client/runtime/library").Decimal;
            priceTable: import(".prisma/client").$Enums.CustomerPriceTable;
            discountPercent: import("@prisma/client/runtime/library").Decimal;
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
            total: import("@prisma/client/runtime/library").Decimal;
            productName: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            unitCost: import("@prisma/client/runtime/library").Decimal;
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
        subtotal: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
    }>;
}
export {};
