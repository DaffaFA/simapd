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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const violation_entity_1 = require("../violations/entities/violation.entity");
const sp_record_entity_1 = require("../sp/entities/sp-record.entity");
const PDFDocument = require("pdfkit");
const stream_1 = require("stream");
let AnalyticsService = class AnalyticsService {
    constructor(violationRepo, spRepo) {
        this.violationRepo = violationRepo;
        this.spRepo = spRepo;
    }
    async getDashboardSummary(date) {
        const target = date ? new Date(date) : new Date();
        const start = new Date(target);
        start.setHours(0, 0, 0, 0);
        const end = new Date(target);
        end.setHours(23, 59, 59, 999);
        const [today, linkedToday, week, sps] = await Promise.all([
            this.violationRepo.count({ where: { detected_at: (0, typeorm_2.Between)(start, end) } }),
            this.violationRepo.count({ where: { detected_at: (0, typeorm_2.Between)(start, end), personnel_id: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) } }),
            this.violationRepo.count({ where: { detected_at: (0, typeorm_2.MoreThanOrEqual)(new Date(Date.now() - 7 * 86400000)) } }),
            this.spRepo.find({ where: { is_active: true } }),
        ]);
        const now = new Date();
        const active = sps.filter(s => s.expires_at > now);
        return {
            compliance_rate: this._estimateRate(today),
            total_violations_today: today,
            total_violations_week: week,
            linked_count: linkedToday,
            unlinked_count: today - linkedToday,
            active_sp_count: active.length,
            sp1_count: active.filter(s => s.level === 'SP1').length,
            sp2_count: active.filter(s => s.level === 'SP2').length,
            sp3_count: active.filter(s => s.level === 'SP3').length,
        };
    }
    _estimateRate(violations) {
        const est = Math.max(violations * 4, 50);
        return Math.round((1 - violations / est) * 1000) / 10;
    }
    async getDailyTrend(days = 7) {
        return Promise.all(Array.from({ length: days }, (_, i) => days - 1 - i).map(async (offset) => {
            const d = new Date();
            d.setDate(d.getDate() - offset);
            const s = new Date(d);
            s.setHours(0, 0, 0, 0);
            const e = new Date(d);
            e.setHours(23, 59, 59, 999);
            const total = await this.violationRepo.count({ where: { detected_at: (0, typeorm_2.Between)(s, e) } });
            return { date: d.toISOString().slice(0, 10), total_violations: total, compliance_rate: this._estimateRate(total) };
        }));
    }
    async getByType(dateFrom, dateTo) {
        const base = this.violationRepo.createQueryBuilder('v');
        if (dateFrom)
            base.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
        if (dateTo)
            base.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });
        const [helm, vest, shoes] = await Promise.all([
            base.clone().andWhere('v.missing_helm = true').getCount(),
            base.clone().andWhere('v.missing_vest = true').getCount(),
            base.clone().andWhere('v.missing_shoes = true').getCount(),
        ]);
        const total = helm + vest + shoes || 1;
        return { helm, vest, shoes,
            helm_pct: Math.round(helm / total * 1000) / 10,
            vest_pct: Math.round(vest / total * 1000) / 10,
            shoes_pct: Math.round(shoes / total * 1000) / 10 };
    }
    async getByShift(dateFrom, dateTo) {
        const qb = this.violationRepo.createQueryBuilder('v')
            .select('v.shift', 'shift').addSelect('COUNT(*)', 'count');
        if (dateFrom)
            qb.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
        if (dateTo)
            qb.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });
        const rows = await qb.groupBy('v.shift').getRawMany();
        const map = Object.fromEntries(rows.map(r => [r.shift, parseInt(r.count)]));
        return { pagi: map['Pagi'] ?? 0, siang: map['Siang'] ?? 0, malam: map['Malam'] ?? 0 };
    }
    async getTopOffenders(limit = 10, dateFrom, dateTo) {
        const qb = this.violationRepo.createQueryBuilder('v')
            .select('v.personnel_id', 'id').addSelect('COUNT(*)', 'count')
            .leftJoin('v.personnel', 'p')
            .addSelect('p.full_name', 'name').addSelect('p.employee_id', 'emp_id').addSelect('p.role', 'role')
            .where('v.personnel_id IS NOT NULL');
        if (dateFrom)
            qb.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
        if (dateTo)
            qb.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });
        const rows = await qb.groupBy('v.personnel_id,p.full_name,p.employee_id,p.role')
            .orderBy('count', 'DESC').limit(limit).getRawMany();
        return rows.map(r => ({
            personnel_id: r.id,
            full_name: r.name,
            employee_id: r.emp_id,
            role: r.role,
            violation_count: parseInt(r.count)
        }));
    }
    async exportCsv(filter) {
        const qb = this.violationRepo.createQueryBuilder('v').leftJoinAndSelect('v.personnel', 'p');
        if (filter.date_from)
            qb.andWhere('v.detected_at >= :df', { df: new Date(filter.date_from) });
        if (filter.date_to)
            qb.andWhere('v.detected_at <= :dt', { dt: new Date(filter.date_to) });
        if (filter.shift)
            qb.andWhere('v.shift = :sh', { sh: filter.shift });
        const rows = await qb.orderBy('v.detected_at', 'DESC').getMany();
        const header = 'Kode,Waktu,Shift,Track ID,Kamera,Helm,Role,Missing Helm,Missing Rompi,Missing Sepatu,Personel\n';
        const body = rows.map(v => [
            v.violation_code, v.detected_at.toISOString(), v.shift, v.track_id, v.camera_id,
            v.helm_color_detected, v.role_detected,
            v.missing_helm ? 'Ya' : 'Tidak', v.missing_vest ? 'Ya' : 'Tidak', v.missing_shoes ? 'Ya' : 'Tidak',
            v.personnel?.full_name ?? '-'
        ].join(',')).join('\n');
        return header + body;
    }
    async exportPdf(dateFrom, dateTo) {
        const [summary, trend, byType, byShift, offenders] = await Promise.all([
            this.getDashboardSummary(),
            this.getDailyTrend(7),
            this.getByType(dateFrom, dateTo),
            this.getByShift(dateFrom, dateTo),
            this.getTopOffenders(10, dateFrom, dateTo),
        ]);
        return this._generatePdf({ summary, trend, byType, byShift, offenders, dateFrom, dateTo });
    }
    _generatePdf(data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 60, right: 60 } });
                const chunks = [];
                const stream = new stream_1.PassThrough();
                doc.pipe(stream);
                stream.on('data', chunk => chunks.push(chunk));
                doc.on('pageAdded', () => {
                    doc.fontSize(10).text(`SiMAPD v1.0 — Halaman ${doc.bufferedPageRange().count}`, 50, doc.page.height - 50, { align: 'center' });
                });
                doc.fontSize(24).text('Laporan Kepatuhan APD (SiMAPD)', { align: 'center' });
                doc.moveDown();
                doc.fontSize(14).text(`Periode: ${data.dateFrom} s/d ${data.dateTo}`, { align: 'center' });
                doc.text(`Tanggal Cetak: ${new Date().toISOString().slice(0, 10)}`, { align: 'center' });
                doc.fontSize(10).text(`SiMAPD v1.0 — Halaman 1`, 50, doc.page.height - 50, { align: 'center' });
                doc.addPage();
                doc.fontSize(18).text('Ringkasan Kepatuhan', { underline: true });
                doc.moveDown();
                doc.fontSize(12).text(`Tingkat Kepatuhan: ${data.summary.compliance_rate}%`);
                doc.text(`Total Pelanggaran (Hari Ini): ${data.summary.total_violations_today}`);
                doc.text(`Total Pelanggaran (Pekan Ini): ${data.summary.total_violations_week}`);
                doc.text(`Pelanggaran Terhubung Personel: ${data.summary.linked_count}`);
                doc.text(`Pelanggaran Belum Terhubung: ${data.summary.unlinked_count}`);
                doc.moveDown();
                doc.text(`Surat Peringatan (SP) Aktif: ${data.summary.active_sp_count}`);
                doc.text(`- SP1: ${data.summary.sp1_count}`);
                doc.text(`- SP2: ${data.summary.sp2_count}`);
                doc.text(`- SP3: ${data.summary.sp3_count}`);
                doc.addPage();
                doc.fontSize(18).text('Tren Kepatuhan (7 Hari Terakhir)', { underline: true });
                doc.moveDown();
                for (const t of data.trend) {
                    doc.fontSize(12).text(`${t.date} : ${t.total_violations} Pelanggaran (Kepatuhan: ${t.compliance_rate}%)`);
                }
                doc.addPage();
                doc.fontSize(18).text('Distribusi Pelanggaran APD', { underline: true });
                doc.moveDown();
                doc.fontSize(12).text(`Tanpa Helm: ${data.byType.helm} (${data.byType.helm_pct}%)`);
                doc.text(`Tanpa Rompi: ${data.byType.vest} (${data.byType.vest_pct}%)`);
                doc.text(`Tanpa Sepatu: ${data.byType.shoes} (${data.byType.shoes_pct}%)`);
                doc.moveDown(2);
                doc.fontSize(18).text('Distribusi Berdasarkan Shift', { underline: true });
                doc.moveDown();
                doc.fontSize(12).text(`Shift Pagi: ${data.byShift.pagi}`);
                doc.text(`Shift Siang: ${data.byShift.siang}`);
                doc.text(`Shift Malam: ${data.byShift.malam}`);
                doc.addPage();
                doc.fontSize(18).text('Top 10 Pelanggar', { underline: true });
                doc.moveDown();
                for (const [idx, o] of data.offenders.entries()) {
                    doc.fontSize(12).text(`${idx + 1}. ${o.full_name} (ID: ${o.employee_id}) - ${o.role}: ${o.violation_count} kali pelanggaran`);
                }
                doc.end();
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', err => reject(err));
            }
            catch (err) {
                reject(err);
            }
        });
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(violation_entity_1.Violation)),
    __param(1, (0, typeorm_1.InjectRepository)(sp_record_entity_1.SpRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map