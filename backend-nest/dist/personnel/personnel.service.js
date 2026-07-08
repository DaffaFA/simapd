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
exports.PersonnelService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const personnel_entity_1 = require("./entities/personnel.entity");
const sp_service_1 = require("../sp/sp.service");
const violation_entity_1 = require("../violations/entities/violation.entity");
let PersonnelService = class PersonnelService {
    constructor(repo, spService) {
        this.repo = repo;
        this.spService = spService;
    }
    async findAll(filter) {
        const qb = this.repo.createQueryBuilder('p');
        if (filter.search) {
            qb.andWhere('(p.full_name ILIKE :s OR p.employee_id ILIKE :s)', { s: `%${filter.search}%` });
        }
        if (filter.role)
            qb.andWhere('p.role = :r', { r: filter.role });
        if (filter.is_active !== undefined)
            qb.andWhere('p.is_active = :a', { a: filter.is_active });
        qb.orderBy('p.full_name', 'ASC')
            .skip(((filter.page ?? 1) - 1) * (filter.page_size ?? 20))
            .take(filter.page_size ?? 20);
        const [items, total] = await qb.getManyAndCount();
        const dtos = await Promise.all(items.map(p => this.toDto(p)));
        return [dtos, total];
    }
    async findOne(id) {
        const p = await this.repo.findOne({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException('Personel tidak ditemukan');
        return this.toDto(p);
    }
    async create(dto) {
        const exists = await this.repo.findOne({ where: { employee_id: dto.employee_id } });
        if (exists)
            throw new common_1.ConflictException('Employee ID sudah terdaftar');
        return this.toDto(await this.repo.save(this.repo.create(dto)));
    }
    async update(id, dto) {
        const p = await this.repo.findOne({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException();
        return this.toDto(await this.repo.save(Object.assign(p, dto)));
    }
    async softDelete(id) {
        const p = await this.repo.findOne({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException();
        p.is_active = false;
        await this.repo.save(p);
    }
    async toDto(p) {
        const [vCount, activeSp] = await Promise.all([
            this.repo.manager.count(violation_entity_1.Violation, { where: { personnel_id: p.id } }),
            this.spService.getActiveSp(p.id),
        ]);
        return { ...p, violation_count: vCount, active_sp: activeSp?.level ?? null };
    }
};
exports.PersonnelService = PersonnelService;
exports.PersonnelService = PersonnelService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(personnel_entity_1.Personnel)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        sp_service_1.SpService])
], PersonnelService);
//# sourceMappingURL=personnel.service.js.map