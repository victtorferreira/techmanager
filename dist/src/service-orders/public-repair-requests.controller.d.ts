import { PublicRepairRequest, ServiceOrdersService } from './service-orders.service';
declare class CreatePublicRepairRequestDto implements PublicRepairRequest {
    name: string;
    phone: string;
    email?: string;
    brand: string;
    model: string;
    color?: string;
    reportedIssue: string;
    accessories?: string;
    devicePowersOn: boolean;
    liquidDamage: boolean;
    previousRepair: boolean;
    preferredContact: 'WHATSAPP' | 'PHONE' | 'EMAIL';
    contactTime?: string;
    privacyAccepted: boolean;
}
export declare class PublicRepairRequestsController {
    private readonly service;
    constructor(service: ServiceOrdersService);
    getAssistance(slug: string): Promise<{
        name: string;
        phone: string | null;
        slug: string;
    }>;
    create(slug: string, dto: CreatePublicRepairRequestDto): Promise<{
        number: number;
        tenantName: string;
    }>;
}
export {};
