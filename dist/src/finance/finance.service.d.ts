import { FinanceEntryStatus, FinanceEntryType, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type CreateEntryInput = {
    type: FinanceEntryType;
    status: FinanceEntryStatus;
    category: string;
    description: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    occurredAt: string;
};
export declare class FinanceService {
    private prisma;
    constructor(prisma: PrismaService);
    summary(tenantId: string, from: string, to: string): Promise<{
        totals: {
            income: Prisma.Decimal;
            expenses: Prisma.Decimal;
            balance: Prisma.Decimal;
            pendingIncome: Prisma.Decimal;
            pendingExpenses: Prisma.Decimal;
        };
        entries: ({
            id: string;
            type: "INCOME";
            status: "PAID";
            category: string;
            description: string;
            amount: Prisma.Decimal;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            occurredAt: Date;
            source: "SALE";
            createdBy: string | null;
        } | {
            id: string;
            type: import(".prisma/client").$Enums.FinanceEntryType;
            status: import(".prisma/client").$Enums.FinanceEntryStatus;
            category: string;
            description: string;
            amount: Prisma.Decimal;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
            occurredAt: Date;
            source: "MANUAL";
            createdBy: string | null;
        })[];
    }>;
    create(tenantId: string, createdById: string, input: CreateEntryInput): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FinanceEntryStatus;
        category: string;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
        createdById: string | null;
        type: import(".prisma/client").$Enums.FinanceEntryType;
        description: string;
        amount: Prisma.Decimal;
        occurredAt: Date;
    }>;
    updateStatus(tenantId: string, id: string, status: FinanceEntryStatus, paymentMethod?: PaymentMethod): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.FinanceEntryStatus;
        category: string;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
        createdById: string | null;
        type: import(".prisma/client").$Enums.FinanceEntryType;
        description: string;
        amount: Prisma.Decimal;
        occurredAt: Date;
    }>;
}
export {};
