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
exports.SpService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sp_record_entity_1 = require("./entities/sp-record.entity");
const sp_config_entity_1 = require("./entities/sp-config.entity");
const violation_entity_1 = require("../violations/entities/violation.entity");
const personnel_entity_1 = require("../personnel/entities/personnel.entity");
let SpService = class SpService {
    constructor(spRepo, cfgRepo) {
        this.spRepo = spRepo;
        this.cfgRepo = cfgRepo;
    }
    async getActiveSp(personnelId) {
        const now = new Date();
        const records = await this.spRepo.find({
            where: { personnel_id: personnelId, is_active: true },
        });
        const active = records.filter((r) => r.expires_at > now);
        if (!active.length)
            return null;
        const order = { SP3: 3, SP2: 2, SP1: 1 };
        return active.sort((a, b) => order[b.level] - order[a.level])[0];
    }
    async countViolationsForPersonnel(personnelId) {
        return this.spRepo.manager
            .createQueryBuilder(violation_entity_1.Violation, 'v')
            .leftJoin('v.links', 'vl')
            .where('(v.personnel_id = :pid OR vl.personnel_id = :pid)', {
            pid: personnelId,
        })
            .getCount();
    }
    async checkAndAutoIssueSp(personnelId, issuedBy, triggerViolationId) {
        const [config, violationCount, currentSp] = await Promise.all([
            this.getConfig(),
            this.countViolationsForPersonnel(personnelId),
            this.getActiveSp(personnelId),
        ]);
        const required = this.computeRequiredLevel(violationCount, config);
        if (!required)
            return null;
        const order = { SP1: 1, SP2: 2, SP3: 3 };
        if (currentSp && order[currentSp.level] >= order[required])
            return currentSp;
        if (currentSp) {
            currentSp.is_active = false;
            await this.spRepo.save(currentSp);
        }
        const durKey = `${required.toLowerCase()}_duration_days`;
        const durationDays = config[durKey];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
        const personnel = await this.spRepo.manager.findOne(personnel_entity_1.Personnel, {
            where: { id: personnelId },
        });
        const spCount = await this.spRepo.count({
            where: { personnel_id: personnelId },
        });
        return this.spRepo.save(this.spRepo.create({
            sp_number: `SP-${personnel?.employee_id ?? personnelId.slice(0, 6)}-${String(spCount + 1).padStart(3, '0')}`,
            personnel_id: personnelId,
            level: required,
            issued_at: new Date(),
            expires_at: expiresAt,
            is_active: true,
            violation_count_at_issuance: violationCount,
            issued_by: issuedBy,
            trigger_violation_id: triggerViolationId,
        }));
    }
    computeRequiredLevel(count, cfg) {
        if (count >= cfg.sp3_threshold)
            return 'SP3';
        if (count >= cfg.sp2_threshold)
            return 'SP2';
        if (count >= cfg.sp1_threshold)
            return 'SP1';
        return null;
    }
    async issueManual(dto, issuedBy) {
        const currentSp = await this.getActiveSp(dto.personnel_id);
        if (currentSp) {
            currentSp.is_active = false;
            await this.spRepo.save(currentSp);
        }
        const cfg = await this.getConfig();
        const durKey = `${dto.level.toLowerCase()}_duration_days`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + cfg[durKey]);
        const violationCount = await this.countViolationsForPersonnel(dto.personnel_id);
        return this.spRepo.save(this.spRepo.create({
            sp_number: `SP-MANUAL-${Date.now()}`,
            personnel_id: dto.personnel_id,
            level: dto.level,
            issued_at: new Date(),
            expires_at: expiresAt,
            is_active: true,
            violation_count_at_issuance: violationCount,
            issued_by: issuedBy,
            notes: dto.notes,
        }));
    }
    async revoke(spId, revokedBy) {
        const sp = await this.spRepo.findOne({ where: { id: spId } });
        if (!sp)
            throw new common_1.NotFoundException();
        sp.is_active = false;
        sp.revoked_at = new Date();
        sp.revoked_by = revokedBy;
        return this.spRepo.save(sp);
    }
    async getConfig() {
        const cfg = await this.cfgRepo.findOne({ where: { is_active: true } });
        if (!cfg)
            throw new common_1.InternalServerErrorException('SP config tidak ditemukan');
        return cfg;
    }
    async updateConfig(dto, updatedBy) {
        const cfg = await this.getConfig();
        Object.assign(cfg, dto);
        cfg.updated_by = updatedBy;
        return this.cfgRepo.save(cfg);
    }
    async findActiveAll(page, pageSize) {
        return this.spRepo.findAndCount({
            where: { is_active: true },
            relations: { personnel: true },
            order: { issued_at: 'DESC' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
    }
    async findAll(personnelId) {
        const where = personnelId ? { personnel_id: personnelId } : {};
        return this.spRepo.find({
            where,
            order: { issued_at: 'DESC' },
            relations: { personnel: true },
        });
    }
    async expireOutdated() {
        const result = await this.spRepo
            .createQueryBuilder()
            .update(sp_record_entity_1.SpRecord)
            .set({ is_active: false })
            .where('is_active = true AND expires_at < NOW()')
            .execute();
        return result.affected ?? 0;
    }
    async generateLetter(spId, issuedByUsername) {
        const sp = await this.spRepo.findOne({
            where: { id: spId },
            relations: { personnel: true },
        });
        if (!sp)
            throw new common_1.NotFoundException('SP tidak ditemukan');
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 72, size: 'A4' });
        const p = sp.personnel;
        const issuedAt = new Date(sp.issued_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const expiresAt = new Date(sp.expires_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        return new Promise((resolve, reject) => {
            try {
                const chunks = [];
                const { PassThrough } = require('stream');
                const stream = new PassThrough();
                doc.pipe(stream);
                stream.on('data', (chunk) => chunks.push(chunk));
                doc
                    .font('Helvetica-Bold')
                    .fontSize(14)
                    .text('SURAT PERINGATAN', { align: 'center' });
                doc.fontSize(16).text(sp.level, { align: 'center' });
                doc.moveDown(0.5);
                doc
                    .moveTo(72, doc.y)
                    .lineTo(doc.page.width - 72, doc.y)
                    .stroke();
                doc.moveDown(0.5);
                doc.font('Helvetica').fontSize(11);
                const tableData = [
                    ['Nomor', sp.sp_number],
                    ['Tanggal', issuedAt],
                ];
                tableData.forEach(([k, v]) => {
                    doc.font('Helvetica-Bold').text(`${k}  :  `, { continued: true });
                    doc.font('Helvetica').text(v);
                });
                doc.moveDown();
                doc
                    .font('Helvetica')
                    .fontSize(11)
                    .text('Dengan ini diberitahukan kepada:', { lineGap: 4 });
                doc.moveDown(0.5);
                const personnelData = [
                    ['Nama', p?.full_name ?? '—'],
                    ['ID Karyawan', p?.employee_id ?? '—'],
                    ['Jabatan', p?.role ?? '—'],
                    ['Departemen', p?.department ?? '—'],
                ];
                personnelData.forEach(([k, v]) => {
                    doc
                        .font('Helvetica-Bold')
                        .text(`${k.padEnd(12)} :  `, { continued: true });
                    doc.font('Helvetica').text(v);
                });
                doc.moveDown();
                doc
                    .font('Helvetica')
                    .fontSize(11)
                    .text(`Bahwa berdasarkan hasil monitoring kepatuhan Alat Pelindung Diri (APD) ` +
                    `menggunakan sistem SiMAPD, karyawan yang bersangkutan telah tercatat melakukan ` +
                    `pelanggaran penggunaan APD sebanyak ${sp.violation_count_at_issuance} kali ` +
                    `yang melebihi batas toleransi yang ditetapkan.`, { lineGap: 6, align: 'justify' });
                doc.moveDown();
                doc.text(`Oleh karena itu, dengan ini diterbitkan ${sp.level} (${sp.level === 'SP1'
                    ? 'Surat Peringatan Pertama'
                    : sp.level === 'SP2'
                        ? 'Surat Peringatan Kedua'
                        : 'Surat Peringatan Ketiga'}) kepada karyawan tersebut. Surat Peringatan ini berlaku ` +
                    `dari ${issuedAt} hingga ${expiresAt}.`, { lineGap: 6, align: 'justify' });
                doc.moveDown();
                doc.text('Diharapkan karyawan yang bersangkutan dapat segera memperbaiki perilaku ' +
                    'dan mematuhi seluruh peraturan keselamatan kerja yang berlaku.', { lineGap: 6, align: 'justify' });
                doc.moveDown(2);
                const signX = doc.page.width - 72 - 180;
                doc
                    .font('Helvetica')
                    .fontSize(11)
                    .text(`Hormat kami,`, signX, doc.y, { width: 180, align: 'center' });
                doc.moveDown(4);
                doc
                    .moveTo(signX, doc.y)
                    .lineTo(signX + 180, doc.y)
                    .stroke();
                doc.moveDown(0.3);
                doc.font('Helvetica-Bold').text(issuedByUsername, signX, doc.y, {
                    width: 180,
                    align: 'center',
                });
                doc
                    .font('Helvetica')
                    .fontSize(10)
                    .text('Safety Officer', signX, doc.y, {
                    width: 180,
                    align: 'center',
                });
                doc.end();
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', (err) => reject(err));
            }
            catch (e) {
                reject(e);
            }
        });
    }
};
exports.SpService = SpService;
exports.SpService = SpService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sp_record_entity_1.SpRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(sp_config_entity_1.SpConfig)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SpService);
//# sourceMappingURL=sp.service.js.map