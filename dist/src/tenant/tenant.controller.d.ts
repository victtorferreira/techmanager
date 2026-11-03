import { TenantService } from './tenant.service';
declare class UpdateTenantProfileDto {
    name: string;
}
export declare class TenantController {
    private readonly tenant;
    constructor(tenant: TenantService);
    getProfile(req: any): Promise<{
        id: string;
        name: string;
        slug: string;
    }>;
    updateProfile(req: any, dto: UpdateTenantProfileDto): Promise<{
        id: string;
        name: string;
        slug: string;
    }>;
}
export {};
