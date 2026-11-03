import { AppointmentStatus } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
declare class ListAppointmentsQuery {
    from?: string;
    to?: string;
}
declare class CreateAppointmentDto {
    customerId: string;
    title: string;
    deviceDescription?: string;
    details?: string;
    startsAt: string;
    endsAt: string;
}
declare class UpdateAppointmentStatusDto {
    status: AppointmentStatus;
}
export declare class AppointmentsController {
    private readonly appointments;
    constructor(appointments: AppointmentsService);
    list(req: any, query: ListAppointmentsQuery): import(".prisma/client").Prisma.PrismaPromise<({
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
    create(req: any, dto: CreateAppointmentDto): Promise<{
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
    updateStatus(req: any, id: string, dto: UpdateAppointmentStatusDto): Promise<{
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
export {};
