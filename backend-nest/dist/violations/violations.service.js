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
const config_1 = require("@nestjs/config");
const typeorm_2 = require("typeorm");
const violation_entity_1 = require("./entities/violation.entity");
const violation_link_entity_1 = require("./entities/violation-link.entity");
const sp_service_1 = require("../sp/sp.service");
let ViolationsService = ViolationsService_1 = class ViolationsService {
    constructor(repo, linkRepo, spService, cfg) {
        this.repo = repo;
        this.linkRepo = linkRepo;
        this.spService = spService;
        this.cfg = cfg;
        this.logger = new common_1.Logger(ViolationsService_1.name);
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
    generateCode(rawTimestamp) {
        let date;
        try {
            date = rawTimestamp ? new Date(rawTimestamp) : new Date();
            if (isNaN(date.getTime())) {
                this.logger.warn(`Invalid timestamp received: "${rawTimestamp}" — fallback ke Date.now()`);
                date = new Date();
            }
        }
        catch {
            date = new Date();
        }
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const sequence = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `VL-${dateStr}-${sequence}`;
    }
    async createFromDetection(dto) {
        let at;
        try {
            at = dto.detected_at ? new Date(dto.detected_at) : new Date();
            if (isNaN(at.getTime())) {
                this.logger.warn(`Invalid timestamp received: "${dto.detected_at}" — fallback ke Date.now()`);
                at = new Date();
            }
        }
        catch {
            at = new Date();
        }
        return this.repo.save(this.repo.create({
            ...dto,
            violation_code: this.generateCode(dto.detected_at),
            detected_at: at,
            shift: ViolationsService_1.computeShift(at),
        }));
    }
    async findAll(filter) {
        const qb = this.repo
            .createQueryBuilder('v')
            .leftJoinAndSelect('v.personnel', 'p')
            .leftJoinAndSelect('v.links', 'links')
            .leftJoinAndSelect('links.personnel', 'linkPersonnel');
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
        if (filter.exclude_status) {
            qb.andWhere('v.status != :exc', { exc: filter.exclude_status });
        }
        if (filter.status) {
            qb.andWhere('v.status = :status', { status: filter.status });
        }
        if (filter.personnel_id) {
            qb.innerJoin('v.links', 'filterLink', 'filterLink.personnel_id = :pid', {
                pid: filter.personnel_id,
            });
        }
        const p = filter.page ?? 1;
        const ps = filter.page_size ?? 20;
        return qb
            .orderBy('v.detected_at', 'DESC')
            .skip((p - 1) * ps)
            .take(ps)
            .getManyAndCount();
    }
    async findOne(id) {
        const v = await this.repo.findOne({
            where: { id },
            relations: { links: { personnel: true } },
        });
        if (!v)
            throw new common_1.NotFoundException();
        return v;
    }
    async linkToPersonnel(violationId, dto, linkedBy) {
        const violation = await this.findOne(violationId);
        if (!violation)
            throw new common_1.NotFoundException('Violation tidak ditemukan');
        const patch = {};
        if (!violation.personnel_id && dto.personnel_ids.length > 0) {
            patch.personnel_id = dto.personnel_ids[0];
            patch.linked_by = linkedBy;
            patch.linked_at = new Date();
        }
        const createdLinks = [];
        const errors = [];
        for (const personnelId of dto.personnel_ids) {
            const existing = await this.linkRepo.findOne({
                where: { violation_id: violationId, personnel_id: personnelId },
            });
            if (existing) {
                errors.push(`Personnel ${personnelId} sudah di-link ke violation ini`);
                continue;
            }
            const link = this.linkRepo.create({
                violation_id: violationId,
                personnel_id: personnelId,
                linked_by: linkedBy,
                notes: dto.notes,
            });
            createdLinks.push(await this.linkRepo.save(link));
            try {
                await this.spService.checkAndAutoIssueSp(personnelId, linkedBy, violationId);
            }
            catch (e) {
                console.error(`SP check failed untuk personnel ${personnelId}:`, e);
            }
        }
        if (errors.length > 0 && createdLinks.length === 0) {
            throw new common_1.ConflictException(errors.join('; '));
        }
        if (createdLinks.length > 0 && violation.status === 'pending') {
            patch.status = 'confirmed';
        }
        if (Object.keys(patch).length > 0) {
            await this.repo.update(violationId, patch);
        }
        return createdLinks;
    }
    async unlinkFromPersonnel(violationId, personnelId) {
        const link = await this.linkRepo.findOne({
            where: { violation_id: violationId, personnel_id: personnelId },
        });
        if (!link)
            throw new common_1.NotFoundException('Link tidak ditemukan');
        await this.linkRepo.remove(link);
        const violation = await this.findOne(violationId);
        if (violation && violation.personnel_id === personnelId) {
            const remainingLinks = await this.linkRepo.find({
                where: { violation_id: violationId },
            });
            await this.repo.update(violationId, {
                personnel_id: remainingLinks.length > 0 ? remainingLinks[0].personnel_id : null,
            });
        }
    }
    async getLinksForViolation(violationId) {
        return this.linkRepo.find({
            where: { violation_id: violationId },
            relations: { personnel: true },
            order: { linked_at: 'ASC' },
        });
    }
    async remove(id) {
        const v = await this.findOne(id);
        await this.repo.remove(v);
    }
    async rejectViolation(id, rejectedBy, reason) {
        const v = await this.repo.findOne({ where: { id } });
        if (!v)
            throw new common_1.NotFoundException('Violation tidak ditemukan');
        if (v.status === 'rejected')
            throw new common_1.ConflictException('Sudah di-reject');
        v.status = 'rejected';
        v.rejected_by = rejectedBy;
        v.rejected_at = new Date();
        v.reject_reason = reason ?? null;
        return this.repo.save(v);
    }
    async confirmViolation(id, confirmedBy) {
        const v = await this.repo.findOne({ where: { id } });
        if (!v)
            throw new common_1.NotFoundException('Violation tidak ditemukan');
        if (v.status === 'rejected')
            throw new common_1.ConflictException('Violation sudah di-reject');
        v.status = 'confirmed';
        return this.repo.save(v);
    }
    async autoRejectExpired() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 2);
        const result = await this.repo
            .createQueryBuilder()
            .update(violation_entity_1.Violation)
            .set({
            status: 'rejected',
            rejected_by: 'system',
            rejected_at: new Date(),
            reject_reason: 'Auto-reject: tidak dikonfirmasi dalam 2 hari',
        })
            .where('status = :status', { status: 'pending' })
            .andWhere('created_at < :cutoff', { cutoff })
            .execute();
        return result.affected ?? 0;
    }
    toResponseDto(v) {
        const frameKey = v.frame_key ?? null;
        let frameUrl = null;
        if (frameKey) {
            const endpoint = this.cfg?.get('RUSTFS_ENDPOINT') ?? 'http://localhost:9000';
            const bucket = this.cfg?.get('RUSTFS_BUCKET') ?? 'simapd-frames';
            frameUrl = `${endpoint}/${bucket}/${frameKey}`;
        }
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
            frame_path: frameUrl,
            frame_key: v.frame_key ?? null,
            personnel_id: v.personnel_id ?? null,
            personnel_name: v.personnel?.full_name ?? null,
            linked_at: v.linked_at ?? null,
            status: v.status ?? 'pending',
            rejected_by: v.rejected_by ?? null,
            rejected_at: v.rejected_at ?? null,
            reject_reason: v.reject_reason ?? null,
            links: (v.links ?? []).map((l) => ({
                personnel_id: l.personnel_id,
                personnel: l.personnel
                    ? { full_name: l.personnel.full_name }
                    : undefined,
            })),
        };
    }
};
exports.ViolationsService = ViolationsService;
exports.ViolationsService = ViolationsService = ViolationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(violation_entity_1.Violation)),
    __param(1, (0, typeorm_1.InjectRepository)(violation_link_entity_1.ViolationLink)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        sp_service_1.SpService,
        config_1.ConfigService])
], ViolationsService);
//# sourceMappingURL=violations.service.js.map