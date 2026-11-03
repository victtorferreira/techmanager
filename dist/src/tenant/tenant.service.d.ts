import { PrismaService } from '../prisma/prisma.service';
export declare class TenantService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(tenantId: string): Promise<{
        id: string;
        name: string;
        slug: string;
    }>;
    updateName(tenantId: string, name: string): Promise<{
        id: string;
        name: string;
        slug: string;
    }>;
}
