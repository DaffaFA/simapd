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
exports.PersonnelController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const personnel_service_1 = require("./personnel.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const personnel_filter_dto_1 = require("./dto/personnel-filter.dto");
const create_personnel_dto_1 = require("./dto/create-personnel.dto");
const update_personnel_dto_1 = require("./dto/update-personnel.dto");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let PersonnelController = class PersonnelController {
    constructor(service) {
        this.service = service;
    }
    async findAll(q) {
        const [items, total] = await this.service.findAll(q);
        return paginated_response_dto_1.PaginatedResponseDto.of(items, total, q.page ?? 1, q.page_size ?? 20);
    }
    async findOne(id) {
        return this.service.findOne(id);
    }
    async create(dto) {
        return this.service.create(dto);
    }
    async update(id, dto) {
        return this.service.update(id, dto);
    }
    async remove(id) {
        return this.service.softDelete(id);
    }
};
exports.PersonnelController = PersonnelController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [personnel_filter_dto_1.PersonnelFilterDto]),
    __metadata("design:returntype", Promise)
], PersonnelController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PersonnelController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('safety_officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_personnel_dto_1.CreatePersonnelDto]),
    __metadata("design:returntype", Promise)
], PersonnelController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('safety_officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_personnel_dto_1.UpdatePersonnelDto]),
    __metadata("design:returntype", Promise)
], PersonnelController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('safety_officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PersonnelController.prototype, "remove", null);
exports.PersonnelController = PersonnelController = __decorate([
    (0, swagger_1.ApiTags)('Personnel'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('personnel'),
    __metadata("design:paramtypes", [personnel_service_1.PersonnelService])
], PersonnelController);
//# sourceMappingURL=personnel.controller.js.map