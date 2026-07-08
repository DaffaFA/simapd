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
exports.ViolationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fs = require("fs");
const path = require("path");
const violations_service_1 = require("./violations.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const user_entity_1 = require("../auth/entities/user.entity");
const violation_filter_dto_1 = require("./dto/violation-filter.dto");
const link_violation_dto_1 = require("./dto/link-violation.dto");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let ViolationsController = class ViolationsController {
    constructor(service) {
        this.service = service;
    }
    async findAll(f) {
        const [items, total] = await this.service.findAll(f);
        const dtos = items.map(v => this.service.toResponseDto(v));
        return paginated_response_dto_1.PaginatedResponseDto.of(dtos, total, f.page ?? 1, f.page_size ?? 20);
    }
    async findOne(id) {
        const v = await this.service.findOne(id);
        return this.service.toResponseDto(v);
    }
    async link(id, dto, user) {
        const linkedViolation = await this.service.linkToPersonnel(id, dto, user.username);
        return this.service.toResponseDto(linkedViolation);
    }
    async unlink(id) {
        const unlinkedViolation = await this.service.unlinkPersonnel(id);
        return this.service.toResponseDto(unlinkedViolation);
    }
    async getFrame(id, res) {
        const violation = await this.service.findOne(id);
        if (!violation.frame_path) {
            throw new common_1.NotFoundException('Frame path is null');
        }
        const filePath = path.resolve(violation.frame_path);
        if (!fs.existsSync(filePath)) {
            throw new common_1.NotFoundException('Frame file not found on disk');
        }
        res.sendFile(filePath);
    }
    async remove(id) {
        return this.service.remove(id);
    }
};
exports.ViolationsController = ViolationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [violation_filter_dto_1.ViolationFilterDto]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/link'),
    (0, roles_decorator_1.Roles)('Safety Officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, link_violation_dto_1.LinkViolationDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "link", null);
__decorate([
    (0, common_1.Delete)(':id/link'),
    (0, roles_decorator_1.Roles)('Safety Officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "unlink", null);
__decorate([
    (0, common_1.Get)(':id/frame'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "getFrame", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('Safety Officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "remove", null);
exports.ViolationsController = ViolationsController = __decorate([
    (0, swagger_1.ApiTags)('Violations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('violations'),
    __metadata("design:paramtypes", [violations_service_1.ViolationsService])
], ViolationsController);
//# sourceMappingURL=violations.controller.js.map