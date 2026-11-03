import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    summary(tenantId: string, fromValue: string, toValue: string): Promise<{
        totals: {
            sales: number;
            saleCount: number;
            averageTicket: number;
            grossProfit: number;
            income: number;
            expenses: number;
            balance: number;
            orders: number;
            newCustomers: number;
            appointments: number;
            completedAppointments: number;
            lowStock: number;
        };
        series: {
            date: string;
            sales: number;
            expenses: number;
            appointments: number;
        }[];
        ordersByStatus: {
            status: string;
            count: number;
        }[];
        appointmentsByStatus: {
            status: string;
            count: number;
        }[];
        topProducts: {
            id: string;
            name: string;
            quantity: number;
            total: number;
        }[];
    }>;
}
