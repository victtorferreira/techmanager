import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export type CreateAppointmentInput = {
    customerId: string;
    title: string;
    deviceDescription?: string;
    details?: string;
    startsAt: string;
    endsAt: string;
};
export declare class AppointmentsService {
    private prisma;
    constructor(prisma: PrismaService);
    list(tenantId: string, from?: string, to?: string): import(".prisma/client").Prisma.PrismaPromise<({
        customer: {
            id: string;
            name: string;
            phone: string | null;
        };
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        title: string;
        deviceDescription: string | null;
        details: string | null;
        startsAt: Date;
        endsAt: Date;
    })[]>;
    create(tenantId: string, input: CreateAppointmentInput): Promise<{
        customer: {
            id: string;
            name: string;
            phone: string | null;
        };
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        title: string;
        deviceDescription: string | null;
        details: string | null;
        startsAt: Date;
        endsAt: Date;
    }>;
    updateStatus(tenantId: string, id: string, status: AppointmentStatus): Promise<{
        customer: {
            id: string;
            name: string;
            phone: string | null;
        };
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        title: string;
        deviceDescription: string | null;
        details: string | null;
        startsAt: Date;
        endsAt: Date;
    }>;
}
