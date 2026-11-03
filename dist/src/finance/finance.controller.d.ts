import { FinanceEntryStatus, FinanceEntryType, PaymentMethod } from '@prisma/client';
import { FinanceService } from './finance.service';
declare class FinanceSummaryQuery {
    from: string;
    to: string;
}
declare class CreateFinanceEntryDto {
    type: FinanceEntryType;
    status: FinanceEntryStatus;
    category: string;
    description: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    occurredAt: string;
}
declare class UpdateFinanceEntryStatusDto {
    status: FinanceEntryStatus;
    paymentMethod?: PaymentMethod;
}
export declare class FinanceController {
    private readonly finance;
    constructor(finance: FinanceService);
    summary(req: any, query: FinanceSummaryQuery): Promise<{
        totals: {
            income: import("@prisma/client/runtime/library").Decimal;
            expenses: import("@prisma/client/runtime/library").Decimal;
            balance: import("@prisma/client/runtime/library").Decimal;
            pendingIncome: import("@prisma/client/runtime/library").Decimal;
            pendingExpenses: import("@prisma/client/runtime/library").Decimal;
        };
        entries: ({
            id: string;
            type: "INCOME";
            status: "PAID";
            category: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
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
            amount: import("@prisma/client/runtime/library").Decimal;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
            occurredAt: Date;
            source: "MANUAL";
            createdBy: string | null;
        })[];
    }>;
    create(req: any, dto: CreateFinanceEntryDto): Promise<{
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
        amount: import("@prisma/client/runtime/library").Decimal;
        occurredAt: Date;
    }>;
    updateStatus(req: any, id: string, dto: UpdateFinanceEntryStatusDto): Promise<{
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
        amount: import("@prisma/client/runtime/library").Decimal;
        occurredAt: Date;
    }>;
}
export {};
