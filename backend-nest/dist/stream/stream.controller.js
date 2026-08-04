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
exports.StreamController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const camera_entity_1 = require("./entities/camera.entity");
const stream_gateway_1 = require("./stream.gateway");
let StreamController = class StreamController {
    constructor(cameraRepo, gateway) {
        this.cameraRepo = cameraRepo;
        this.gateway = gateway;
    }
    async getCameras() {
        return this.cameraRepo.find({ order: { created_at: 'DESC' } });
    }
    async createCamera(dto) {
        return this.cameraRepo.save(this.cameraRepo.create(dto));
    }
    async updateCamera(id, dto) {
        const cam = await this.cameraRepo.findOne({ where: { id } });
        if (!cam)
            throw new common_1.NotFoundException('Kamera tidak ditemukan');
        Object.assign(cam, dto);
        return this.cameraRepo.save(cam);
    }
    async deleteCamera(id) {
        const result = await this.cameraRepo.delete(id);
        if (!result.affected)
            throw new common_1.NotFoundException('Kamera tidak ditemukan');
    }
    getStatus() {
        return {
            active_connections: this.gateway.getConnectionCount(),
            server_time: new Date().toISOString()
        };
    }
    async injectTestFrame(res) {
        const tinyRedJpeg = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
            'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
            'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
            'MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAA' +
            'AgIBBQEBAAAAAAAAAAAAAQIDBAURBhITFP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEA' +
            'AAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDKtWrVq//Z';
        const testMsg = {
            event: 'frame',
            camera_id: 'TEST-INJECT',
            frame_b64: tinyRedJpeg,
            width: 1,
            height: 1,
            detections: [{
                    track_id: 99,
                    bbox: [0, 0, 100, 200],
                    helm_color: 'Kuning',
                    role_label: 'Pekerja',
                    is_compliant: false,
                    missing_ppe: ['helm'],
                }],
            timestamp: new Date().toISOString(),
        };
        this.gateway.broadcast(testMsg);
        return res.json({
            ok: true,
            message: 'Test frame dikirim ke semua WS clients',
            clients: this.gateway.getConnectionCount(),
        });
    }
};
exports.StreamController = StreamController;
__decorate([
    (0, common_1.Get)('cameras'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "getCameras", null);
__decorate([
    (0, common_1.Post)('cameras'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('Safety Officer', 'admin'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "createCamera", null);
__decorate([
    (0, common_1.Patch)('cameras/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('Safety Officer', 'admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "updateCamera", null);
__decorate([
    (0, common_1.Delete)('cameras/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "deleteCamera", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StreamController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('inject-test'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StreamController.prototype, "injectTestFrame", null);
exports.StreamController = StreamController = __decorate([
    (0, swagger_1.ApiTags)('Stream'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('stream'),
    __param(0, (0, typeorm_1.InjectRepository)(camera_entity_1.Camera)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        stream_gateway_1.StreamGateway])
], StreamController);
//# sourceMappingURL=stream.controller.js.map