"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
function customerWriteData(data) {
    const { dateOfBirth, creditLimit, discountPercent, ...fields } = data;
    return {
        ...fields,
        ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth.slice(0, 10)}T12:00:00.000Z`) : null } : {}),
        ...(creditLimit !== undefined ? { creditLimit: new client_1.Prisma.Decimal(creditLimit) } : {}),
        ...(discountPercent !== undefined ? { discountPercent: new client_1.Prisma.Decimal(discountPercent) } : {}),
    };
}
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(tenantId) {
        return this.prisma.customer.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 });
    }
    create(tenantId, data) {
        return this.prisma.customer.create({ data: { ...customerWriteData(data), tenantId } });
    }
    async update(tenantId, id, data) {
        const customer = await this.prisma.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!customer)
            throw new common_1.NotFoundException('Cliente não encontrado.');
        return this.prisma.customer.update({ where: { id }, data: customerWriteData(data) });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map