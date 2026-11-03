import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { FinanceModule } from './finance/finance.module';
import { ReportsModule } from './reports/reports.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CustomersModule,
    ServiceOrdersModule,
    ProductsModule,
    SalesModule,
    AppointmentsModule,
    FinanceModule,
    ReportsModule,
    TenantModule,
  ],
})
export class AppModule {}
