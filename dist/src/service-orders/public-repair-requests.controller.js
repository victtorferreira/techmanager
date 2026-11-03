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
exports.PublicRepairRequestsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const service_orders_service_1 = require("./service-orders.service");
class CreatePublicRepairRequestDto {
}
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 100),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "name", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[+()\d\s.-]{8,25}$/),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "phone", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.Length)(3, 160),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "email", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 80),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "brand", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "model", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 50),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "color", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(10, 2000),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "reportedIssue", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 500),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "accessories", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePublicRepairRequestDto.prototype, "devicePowersOn", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePublicRepairRequestDto.prototype, "liquidDamage", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePublicRepairRequestDto.prototype, "previousRepair", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['WHATSAPP', 'PHONE', 'EMAIL']),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "preferredContact", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (value.trim() || undefined) : value),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreatePublicRepairRequestDto.prototype, "contactTime", void 0);
__decorate([
    (0, class_validator_1.Equals)(true),
    __metadata("design:type", Boolean)
], CreatePublicRepairRequestDto.prototype, "privacyAccepted", void 0);
let PublicRepairRequestsController = class PublicRepairRequestsController {
    constructor(service) {
        this.service = service;
    }
    getAssistance(slug) {
        return this.service.publicTenant(slug);
    }
    create(slug, dto) {
        const { privacyAccepted: _privacyAccepted, ...request } = dto;
        return this.service.createPublicRequest(slug, request);
    }
};
exports.PublicRepairRequestsController = PublicRepairRequestsController;
__decorate([
    (0, common_1.Get)(':slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicRepairRequestsController.prototype, "getAssistance", null);
__decorate([
    (0, common_1.Post)(':slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreatePublicRepairRequestDto]),
    __metadata("design:returntype", void 0)
], PublicRepairRequestsController.prototype, "create", null);
exports.PublicRepairRequestsController = PublicRepairRequestsController = __decorate([
    (0, swagger_1.ApiTags)('Solicitação pública'),
    (0, common_1.Controller)('public/repair-requests'),
    __metadata("design:paramtypes", [service_orders_service_1.ServiceOrdersService])
], PublicRepairRequestsController);
//# sourceMappingURL=public-repair-requests.controller.js.map