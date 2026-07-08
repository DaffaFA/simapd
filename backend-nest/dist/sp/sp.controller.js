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
exports.SpController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sp_service_1 = require("./sp.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const issue_sp_dto_1 = require("./dto/issue-sp.dto");
const sp_config_update_dto_1 = require("./dto/sp-config-update.dto");
const user_entity_1 = require("../auth/entities/user.entity");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let SpController = class SpController {
    constructor(spService) {
        this.spService = spService;
    }
    async issue(dto, user) {
        return this.spService.issueManual(dto, user.username);
    }
    async revoke(id, user) {
        return this.spService.revoke(id, user.username);
    }
    async getConfig() {
        return this.spService.getConfig();
    }
    async updateConfig(dto, user) {
        return this.spService.updateConfig(dto, user.username);
    }
    async getActive(page = '1', pageSize = '20') {
        const p = parseInt(page, 10);
        const ps = parseInt(pageSize, 10);
        const [items, total] = await this.spService.findActiveAll(p, ps);
        return paginated_response_dto_1.PaginatedResponseDto.of(items, total, p, ps);
    }
};
exports.SpController = SpController;
__decorate([
    (0, common_1.Post)('issue'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [issue_sp_dto_1.IssueSpDto, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SpController.prototype, "issue", null);
__decorate([
    (0, common_1.Post)(':id/revoke'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SpController.prototype, "revoke", null);
__decorate([
    (0, common_1.Get)('config'),
    (0, roles_decorator_1.Roles)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SpController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)('config'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sp_config_update_dto_1.SpConfigUpdateDto, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SpController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('page_size')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SpController.prototype, "getActive", null);
exports.SpController = SpController = __decorate([
    (0, swagger_1.ApiTags)('SP Management'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('Safety Officer', 'admin'),
    (0, common_1.Controller)('sp'),
    __metadata("design:paramtypes", [sp_service_1.SpService])
], SpController);
//# sourceMappingURL=sp.controller.js.map