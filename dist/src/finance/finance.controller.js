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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const finance_service_1 = require("./finance.service");
class FinanceSummaryQuery {
}
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], FinanceSummaryQuery.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], FinanceSummaryQuery.prototype, "to", void 0);
class CreateFinanceEntryDto {
}
__decorate([
    (0, class_validator_1.IsEnum)(client_1.FinanceEntryType),
    __metadata("design:type", String)
], CreateFinanceEntryDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.FinanceEntryStatus),
    __metadata("design:type", String)
], CreateFinanceEntryDto.prototype, "status", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 60),
    __metadata("design:type", String)
], CreateFinanceEntryDto.prototype, "category", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 240),
    __metadata("design:type", String)
], CreateFinanceEntryDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    (0, class_validator_1.Max)(999999999),
    __metadata("design:type", Number)
], CreateFinanceEntryDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PaymentMethod),
    __metadata("design:type", String)
], CreateFinanceEntryDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateFinanceEntryDto.prototype, "occurredAt", void 0);
class UpdateFinanceEntryStatusDto {
}
__decorate([
    (0, class_validator_1.IsIn)([client_1.FinanceEntryStatus.PAID, client_1.FinanceEntryStatus.CANCELED]),
    __metadata("design:type", String)
], UpdateFinanceEntryStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PaymentMethod),
    __metadata("design:type", String)
], UpdateFinanceEntryStatusDto.prototype, "paymentMethod", void 0);
let FinanceController = class FinanceController {
    constructor(finance) {
        this.finance = finance;
    }
    summary(req, query) {
        return this.finance.summary(req.user.tenantId, query.from, query.to);
    }
    create(req, dto) {
        return this.finance.create(req.user.tenantId, req.user.userId, dto);
    }
    updateStatus(req, id, dto) {
        return this.finance.updateStatus(req.user.tenantId, id, dto.status, dto.paymentMethod);
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, FinanceSummaryQuery]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)('entries'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateFinanceEntryDto]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('entries/:id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, UpdateFinanceEntryStatusDto]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "updateStatus", null);
exports.FinanceController = FinanceController = __decorate([
    (0, swagger_1.ApiTags)('Financeiro'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('finance'),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map