import { PrismaService } from '../prisma/prisma.service';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    list(tenantId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        tenantId: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        sku: string | null;
        category: string | null;
        costPrice: import("@prisma/client/runtime/library").Decimal;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        stockQuantity: number;
        minimumStock: number;
    }[]>;
    create(tenantId: string, data: {
        name: string;
        sku?: string;
        category?: string;
        costPrice: number;
        salePrice: number;
        stockQuantity?: number;
        minimumStock?: number;
    }): import(".prisma/client").Prisma.Prisma__ProductClient<{
        id: string;
        tenantId: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        sku: string | null;
        category: string | null;
        costPrice: import("@prisma/client/runtime/library").Decimal;
        salePrice: import("@prisma/client/runtime/library").Decimal;
        stockQuantity: number;
        minimumStock: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
