import { ProductsService } from './products.service';
declare class CreateProductDto {
    name: string;
    sku?: string;
    category?: string;
    costPrice: number;
    salePrice: number;
    stockQuantity?: number;
    minimumStock?: number;
}
export declare class ProductsController {
    private service;
    constructor(service: ProductsService);
    list(req: any): import(".prisma/client").Prisma.PrismaPromise<{
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
    create(req: any, dto: CreateProductDto): import(".prisma/client").Prisma.Prisma__ProductClient<{
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
export {};
