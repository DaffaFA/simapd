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
const promises_1 = require("stream/promises");
const violations_service_1 = require("./violations.service");
const storage_service_1 = require("../storage/storage.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const user_entity_1 = require("../auth/entities/user.entity");
const violation_filter_dto_1 = require("./dto/violation-filter.dto");
const link_violation_dto_1 = require("./dto/link-violation.dto");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let ViolationsController = class ViolationsController {
    constructor(service, storage) {
        this.service = service;
        this.storage = storage;
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
    async linkToPersonnel(id, dto, user) {
        const links = await this.service.linkToPersonnel(id, dto, user.username);
        return {
            message: `${links.length} orang berhasil di-link ke violation`,
            linked: links.map(l => ({
                id: l.id,
                personnel_id: l.personnel_id,
                linked_by: l.linked_by,
                linked_at: l.linked_at,
            })),
        };
    }
    async getViolationLinks(id) {
        const links = await this.service.getLinksForViolation(id);
        return links.map(l => ({
            id: l.id,
            personnel_id: l.personnel_id,
            personnel: l.personnel ? {
                id: l.personnel.id,
                employee_id: l.personnel.employee_id,
                full_name: l.personnel.full_name,
                role: l.personnel.role,
                department: l.personnel.department,
            } : null,
            linked_by: l.linked_by,
            linked_at: l.linked_at,
            notes: l.notes,
        }));
    }
    async unlinkFromPersonnel(id, personnelId) {
        await this.service.unlinkFromPersonnel(id, personnelId);
        return { message: 'Link berhasil dihapus' };
    }
    async getViolationFrame(id, res) {
        const violation = await this.service.findOne(id);
        if (!violation)
            throw new common_1.NotFoundException('Violation tidak ditemukan');
        if (violation.frame_key) {
            const stream = await this.storage.streamObject(violation.frame_key);
            if (!stream) {
                throw new common_1.NotFoundException('Frame tidak ditemukan di storage');
            }
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Content-Disposition', `inline; filename="violation-${id}.jpg"`);
            try {
                await (0, promises_1.pipeline)(stream, res);
            }
            catch (e) {
            }
            return;
        }
        if (violation.frame_path) {
            if (!fs.existsSync(violation.frame_path)) {
                throw new common_1.NotFoundException('File frame tidak ditemukan di disk');
            }
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Disposition', `inline; filename="violation_${id}.jpg"`);
            fs.createReadStream(violation.frame_path).pipe(res);
            return;
        }
        throw new common_1.NotFoundException('Frame tidak tersedia untuk violation ini');
    }
    async rejectViolation(id, reason, user) {
        const v = await this.service.rejectViolation(id, user.username, reason);
        return this.service.toResponseDto(v);
    }
    async confirmViolation(id, user) {
        const v = await this.service.confirmViolation(id, user.username);
        return this.service.toResponseDto(v);
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
    (0, roles_decorator_1.Roles)('safety_officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, link_violation_dto_1.LinkViolationDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "linkToPersonnel", null);
__decorate([
    (0, common_1.Get)(':id/links'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "getViolationLinks", null);
__decorate([
    (0, common_1.Delete)(':id/link/:personnelId'),
    (0, roles_decorator_1.Roles)('safety_officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('personnelId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "unlinkFromPersonnel", null);
__decorate([
    (0, common_1.Get)(':id/frame'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "getViolationFrame", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, roles_decorator_1.Roles)('safety_officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "rejectViolation", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    (0, roles_decorator_1.Roles)('safety_officer', 'admin'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ViolationsController.prototype, "confirmViolation", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('safety_officer', 'admin'),
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
    __metadata("design:paramtypes", [violations_service_1.ViolationsService,
        storage_service_1.StorageService])
], ViolationsController);
//# sourceMappingURL=violations.controller.js.map