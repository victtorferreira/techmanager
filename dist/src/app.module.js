"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const customers_module_1 = require("./customers/customers.module");
const service_orders_module_1 = require("./service-orders/service-orders.module");
const products_module_1 = require("./products/products.module");
const sales_module_1 = require("./sales/sales.module");
const appointments_module_1 = require("./appointments/appointments.module");
const finance_module_1 = require("./finance/finance.module");
const reports_module_1 = require("./reports/reports.module");
const tenant_module_1 = require("./tenant/tenant.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            customers_module_1.CustomersModule,
            service_orders_module_1.ServiceOrdersModule,
            products_module_1.ProductsModule,
            sales_module_1.SalesModule,
            appointments_module_1.AppointmentsModule,
            finance_module_1.FinanceModule,
            reports_module_1.ReportsModule,
            tenant_module_1.TenantModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map