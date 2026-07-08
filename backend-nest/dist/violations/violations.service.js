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
var ViolationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const violation_entity_1 = require("./entities/violation.entity");
const sp_service_1 = require("../sp/sp.service");
let ViolationsService = ViolationsService_1 = class ViolationsService {
    constructor(repo, spService) {
        this.repo = repo;
        this.spService = spService;
    }
    static computeShift(date) {
        const h = date.getHours();
        if (h >= 7 && h < 15)
            return 'Pagi';
        if (h >= 15 && h < 23)
            return 'Siang';
        return 'Malam';
    }
    static buildMissingList(v) {
        return [
            v.missing_helm && 'helm',
            v.missing_vest && 'vest',
            v.missing_shoes && 'sepatu',
        ].filter(Boolean);
    }
    async generateCode(date) {
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        const count = await this.repo.createQueryBuilder('v')
            .where('v.detected_at BETWEEN :s AND :e', { s: start, e: end })
            .getCount();
        return `VL-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    }
    async createFromDetection(dto) {
        const at = dto.detected_at ?? new Date();
        return this.repo.save(this.repo.create({
            ...dto,
            violation_code: await this.generateCode(at),
            detected_at: at,
            shift: ViolationsService_1.computeShift(at),
        }));
    }
    async findAll(filter) {
        const qb = this.repo.createQueryBuilder('v').leftJoinAndSelect('v.personnel', 'p');
        if (filter.date_from)
            qb.andWhere('v.detected_at >= :df', { df: new Date(filter.date_from) });
        if (filter.date_to)
            qb.andWhere('v.detected_at <= :dt', { dt: new Date(filter.date_to) });
        if (filter.shift)
            qb.andWhere('v.shift = :sh', { sh: filter.shift });
        if (filter.camera_id)
            qb.andWhere('v.camera_id = :cam', { cam: filter.camera_id });
        if (filter.missing_ppe === 'helm')
            qb.andWhere('v.missing_helm = true');
        if (filter.missing_ppe === 'vest')
            qb.andWhere('v.missing_vest = true');
        if (filter.missing_ppe === 'sepatu')
            qb.andWhere('v.missing_shoes = true');
        if (filter.is_linked === true)
            qb.andWhere('v.personnel_id IS NOT NULL');
        if (filter.is_linked === false)
            qb.andWhere('v.personnel_id IS NULL');
        if (filter.personnel_id)
            qb.andWhere('v.personnel_id = :pid', { pid: filter.personnel_id });
        const p = filter.page ?? 1;
        const ps = filter.page_size ?? 20;
        return qb.orderBy('v.detected_at', 'DESC')
            .skip((p - 1) * ps)
            .take(ps)
            .getManyAndCount();
    }
    async findOne(id) {
        const v = await this.repo.findOne({ where: { id }, relations: { personnel: true } });
        if (!v)
            throw new common_1.NotFoundException();
        return v;
    }
    async linkToPersonnel(id, dto, linkedBy) {
        const v = await this.findOne(id);
        v.personnel_id = dto.personnel_id;
        v.linked_by = linkedBy;
        v.linked_at = new Date();
        v.notes = dto.notes ?? v.notes;
        await this.repo.save(v);
        await this.spService.checkAndAutoIssueSp(dto.personnel_id, linkedBy, id);
        return this.findOne(id);
    }
    async unlinkPersonnel(id) {
        const v = await this.findOne(id);
        v.personnel_id = null;
        v.linked_by = null;
        v.linked_at = null;
        return this.repo.save(v);
    }
    async remove(id) {
        const v = await this.findOne(id);
        await this.repo.remove(v);
    }
    toResponseDto(v) {
        return {
            id: v.id,
            violation_code: v.violation_code,
            track_id: v.track_id,
            camera_id: v.camera_id,
            detected_at: v.detected_at,
            shift: v.shift,
            helm_color_detected: v.helm_color_detected,
            role_detected: v.role_detected,
            missing_helm: v.missing_helm,
            missing_vest: v.missing_vest,
            missing_shoes: v.missing_shoes,
            missing_ppe_list: ViolationsService_1.buildMissingList(v),
            confidence: v.confidence,
            bbox: [v.bbox_x1, v.bbox_y1, v.bbox_x2, v.bbox_y2],
            frame_path: v.frame_path ?? null,
            personnel_id: v.personnel_id ?? null,
            personnel_name: v.personnel?.full_name ?? null,
            linked_at: v.linked_at ?? null,
        };
    }
};
exports.ViolationsService = ViolationsService;
exports.ViolationsService = ViolationsService = ViolationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(violation_entity_1.Violation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        sp_service_1.SpService])
], ViolationsService);
//# sourceMappingURL=violations.service.js.map