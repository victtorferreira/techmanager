import { ReportsService } from './reports.service';
declare class ReportPeriodQuery {
    from: string;
    to: string;
}
export declare class ReportsController {
    private readonly reports;
    constructor(reports: ReportsService);
    summary(req: any, query: ReportPeriodQuery): Promise<{
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
export {};
