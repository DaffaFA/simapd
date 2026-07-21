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
var StreamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
const violations_service_1 = require("../violations/violations.service");
const stream_gateway_1 = require("./stream.gateway");
let StreamService = StreamService_1 = class StreamService {
    constructor(redis, violations, gateway) {
        this.redis = redis;
        this.violations = violations;
        this.gateway = gateway;
        this.logger = new common_1.Logger(StreamService_1.name);
        this.cooldown = new Map();
        this.COOLDOWN_MS = 30_000;
    }
    async onApplicationBootstrap() {
        await this.redis.subscribe('detections', raw => this.onDetection(raw));
        await this.redis.subscribe('heartbeat', raw => this.onHeartbeat(raw));
        await this.redis.subscribe('frames', raw => this.onFrame(raw));
        this.logger.log('Subscribed: detections, heartbeat, frames');
    }
    onFrame(raw) {
        try {
            const msg = JSON.parse(raw);
            this.gateway.broadcast(msg);
        }
        catch {
        }
    }
    async onDetection(raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        }
        catch {
            return;
        }
        this.gateway.broadcast(msg);
        if (!msg.is_compliant) {
            const now = Date.now();
            if (now - (this.cooldown.get(msg.track_id) ?? 0) < this.COOLDOWN_MS)
                return;
            this.cooldown.set(msg.track_id, now);
            try {
                const v = await this.violations.createFromDetection({
                    track_id: msg.track_id,
                    camera_id: msg.camera_id,
                    detected_at: new Date(msg.timestamp),
                    helm_color_detected: msg.helm_color,
                    role_detected: msg.role_label,
                    missing_helm: msg.missing_ppe.includes('helm'),
                    missing_vest: msg.missing_ppe.includes('vest'),
                    missing_shoes: msg.missing_ppe.includes('sepatu'),
                    confidence: msg.confidence,
                    bbox_x1: msg.bbox[0],
                    bbox_y1: msg.bbox[1],
                    bbox_x2: msg.bbox[2],
                    bbox_y2: msg.bbox[3],
                    frame_path: msg.frame_path ?? undefined,
                    frame_key: msg.frame_key ?? undefined,
                });
                this.gateway.broadcast({
                    event: 'violation_alert',
                    violation_id: v.id,
                    violation_code: v.violation_code,
                    track_id: msg.track_id,
                    camera_id: msg.camera_id,
                    role_label: msg.role_label,
                    missing_ppe: msg.missing_ppe,
                    timestamp: msg.timestamp,
                });
            }
            catch (e) {
                this.logger.error('Save violation failed:', e);
            }
            if (this.cooldown.size > 1000) {
                const cutoff = Date.now() - this.COOLDOWN_MS;
                this.cooldown.forEach((t, k) => {
                    if (t < cutoff)
                        this.cooldown.delete(k);
                });
            }
        }
    }
    onHeartbeat(raw) {
        try {
            this.gateway.broadcast({ event: 'camera_heartbeat', ...JSON.parse(raw) });
        }
        catch { }
    }
};
exports.StreamService = StreamService;
exports.StreamService = StreamService = StreamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => stream_gateway_1.StreamGateway))),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        violations_service_1.ViolationsService,
        stream_gateway_1.StreamGateway])
], StreamService);
//# sourceMappingURL=stream.service.js.map