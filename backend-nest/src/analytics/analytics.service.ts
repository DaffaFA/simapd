import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, Not, IsNull } from 'typeorm';
import { Violation } from '../violations/entities/violation.entity';
import { SpRecord } from '../sp/entities/sp-record.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import * as PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Violation) private violationRepo: Repository<Violation>,
    @InjectRepository(SpRecord) private spRepo: Repository<SpRecord>,
  ) {}

  async getDashboardSummary(date?: string) {
    const target = date ? new Date(date) : new Date();
    const start = new Date(target); start.setHours(0,0,0,0);
    const end   = new Date(target); end.setHours(23,59,59,999);
    
    const [today, linkedToday, week, sps] = await Promise.all([
      this.violationRepo.count({ where: { detected_at: Between(start, end) } }),
      this.violationRepo.count({ where: { detected_at: Between(start, end), personnel_id: Not(IsNull()) } }),
      this.violationRepo.count({ where: { detected_at: MoreThanOrEqual(new Date(Date.now()-7*86400000)) } }),
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
      sp1_count: active.filter(s=>s.level==='SP1').length,
      sp2_count: active.filter(s=>s.level==='SP2').length,
      sp3_count: active.filter(s=>s.level==='SP3').length,
    };
  }

  private _estimateRate(violations: number): number {
    // MVP: asumsi total detections per hari = violations * 4 (minimum 50)
    // Ganti dengan counter aktual jika tersedia
    const est = Math.max(violations * 4, 50);
    return Math.round((1 - violations/est) * 1000) / 10;
  }

  async getDailyTrend(days=7) {
    return Promise.all(Array.from({length:days},(_,i)=>days-1-i).map(async offset => {
      const d = new Date(); d.setDate(d.getDate()-offset);
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setHours(23,59,59,999);
      const total = await this.violationRepo.count({ where: { detected_at: Between(s,e) } });
      return { date: d.toISOString().slice(0,10), total_violations: total, compliance_rate: this._estimateRate(total) };
    }));
  }

  async getByType(dateFrom?: string, dateTo?: string) {
    const base = this.violationRepo.createQueryBuilder('v');
    if (dateFrom) base.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
    if (dateTo)   base.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });
    
    const [helm, vest, shoes] = await Promise.all([
      base.clone().andWhere('v.missing_helm = true').getCount(),
      base.clone().andWhere('v.missing_vest = true').getCount(),
      base.clone().andWhere('v.missing_shoes = true').getCount(),
    ]);
    
    const total = helm+vest+shoes || 1;
    return { helm, vest, shoes,
      helm_pct: Math.round(helm/total*1000)/10,
      vest_pct: Math.round(vest/total*1000)/10,
      shoes_pct: Math.round(shoes/total*1000)/10 };
  }

  async getByShift(dateFrom?: string, dateTo?: string) {
    const qb = this.violationRepo.createQueryBuilder('v')
      .select('v.shift','shift').addSelect('COUNT(*)','count');
    if (dateFrom) qb.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
    if (dateTo)   qb.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });
    
    const rows = await qb.groupBy('v.shift').getRawMany();
    const map = Object.fromEntries(rows.map(r=>[r.shift, parseInt(r.count)]));
    return { pagi: map['Pagi']??0, siang: map['Siang']??0, malam: map['Malam']??0 };
  }

  async getTopOffenders(limit=10, dateFrom?: string, dateTo?: string) {
    const qb = this.violationRepo.createQueryBuilder('v')
      .select('v.personnel_id','id').addSelect('COUNT(*)','count')
      .leftJoin('v.personnel','p')
      .addSelect('p.full_name','name').addSelect('p.employee_id','emp_id').addSelect('p.role','role')
      .where('v.personnel_id IS NOT NULL');
    
    if (dateFrom) qb.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
    if (dateTo)   qb.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });
    
    const rows = await qb.groupBy('v.personnel_id,p.full_name,p.employee_id,p.role')
      .orderBy('count','DESC').limit(limit).getRawMany();
    
    return rows.map(r=>({ 
      personnel_id: r.id, 
      full_name: r.name, 
      employee_id: r.emp_id, 
      role: r.role, 
      violation_count: parseInt(r.count) 
    }));
  }

  async exportCsv(filter: AnalyticsQueryDto): Promise<string> {
    const qb = this.violationRepo.createQueryBuilder('v').leftJoinAndSelect('v.personnel','p');
    if (filter.date_from) qb.andWhere('v.detected_at >= :df', { df: new Date(filter.date_from) });
    if (filter.date_to)   qb.andWhere('v.detected_at <= :dt', { dt: new Date(filter.date_to) });
    if (filter.shift)      qb.andWhere('v.shift = :sh', { sh: filter.shift });
    
    const rows = await qb.orderBy('v.detected_at','DESC').getMany();
    const header = 'Kode,Waktu,Shift,Track ID,Kamera,Helm,Role,Missing Helm,Missing Rompi,Missing Sepatu,Personel\n';
    const body = rows.map(v=>[
      v.violation_code, v.detected_at.toISOString(), v.shift, v.track_id, v.camera_id,
      v.helm_color_detected, v.role_detected,
      v.missing_helm?'Ya':'Tidak', v.missing_vest?'Ya':'Tidak', v.missing_shoes?'Ya':'Tidak',
      v.personnel?.full_name??'-'
    ].join(',')).join('\n');
    return header + body;
  }

  private dateWhere(dateFrom?: string, dateTo?: string) {
    const where: any = {}
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01')
      const to   = dateTo   ? new Date(dateTo)   : new Date()
      to.setHours(23, 59, 59, 999)   // sampai akhir hari
      where.detected_at = Between(from, to)
    }
    return where
  }

  async exportPdf(dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const from = dateFrom ?? new Date(Date.now()-30*86400000).toISOString().slice(0,10);
    const to   = dateTo ?? new Date().toISOString().slice(0,10);
    const [summary, trend, byType, byShift, offenders] = await Promise.all([
      this.getDashboardSummary(), 
      this.getDailyTrend(7),
      this.getByType(from, to), 
      this.getByShift(from, to),
      this.getTopOffenders(10, from, to),
    ]);
    return this._generatePdf({ summary, trend, byType, byShift, offenders, dateFrom: from, dateTo: to });
  }

  async exportExcel(dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs')
    const wb  = new ExcelJS.Workbook()
    wb.creator = 'SiMAPD'
    wb.created = new Date()

    const where      = this.dateWhere(dateFrom, dateTo)
    const violations = await this.violationRepo.find({
      where, order: { detected_at: 'DESC' },
      relations: { links: { personnel: true }, personnel: true },
    })

    // ── Sheet 1: Ringkasan ─────────────────────────────────────────────────
    const ws1 = wb.addWorksheet('Ringkasan')
    ws1.columns = [
      { header: 'Keterangan', key: 'label', width: 35 },
      { header: 'Nilai',      key: 'value', width: 20 },
    ]
    const total    = violations.length
    const noHelm   = violations.filter(v => v.missing_helm).length
    const noVest   = violations.filter(v => v.missing_vest).length
    const noShoes  = violations.filter(v => v.missing_shoes).length
    const linked   = violations.filter(v => v.personnel_id || (v.links && v.links.length > 0)).length
    ws1.addRows([
      { label: 'Periode',                    value: `${dateFrom ?? 'Semua'} – ${dateTo ?? 'Semua'}` },
      { label: 'Total Pelanggaran',          value: total },
      { label: 'Tanpa Helm',                 value: noHelm },
      { label: 'Tanpa Rompi',                value: noVest },
      { label: 'Tanpa Sepatu',               value: noShoes },
      { label: 'Pelanggaran Terhubung ke Karyawan', value: linked },
      { label: 'Pelanggaran Belum Terhubung',       value: total - linked },
    ])
    ws1.getRow(1).font = { bold: true }
    ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0FF' } }

    // ── Sheet 2: Detail Pelanggaran ────────────────────────────────────────
    const ws2 = wb.addWorksheet('Detail Pelanggaran')
    ws2.columns = [
      { header: 'Kode',         key: 'code',      width: 20 },
      { header: 'Tanggal',      key: 'date',      width: 22 },
      { header: 'Shift',        key: 'shift',     width: 10 },
      { header: 'Kamera',       key: 'cam',       width: 18 },
      { header: 'Track ID',     key: 'track',     width: 10 },
      { header: 'Tanpa Helm',   key: 'helm',      width: 14 },
      { header: 'Tanpa Rompi',  key: 'vest',      width: 14 },
      { header: 'Tanpa Sepatu', key: 'shoes',     width: 14 },
      { header: 'Warna Helm',   key: 'color',     width: 14 },
      { header: 'Karyawan',     key: 'personnel', width: 30 },
    ]
    violations.forEach(v => {
      let names = v.personnel?.full_name;
      if (!names && v.links?.length > 0) {
        names = v.links.map(l => l.personnel?.full_name).filter(Boolean).join(', ');
      }
      ws2.addRow({
        code:      v.violation_code,
        date:      new Date(v.detected_at).toLocaleString('id-ID'),
        shift:     v.shift,
        cam:       v.camera_id,
        track:     v.track_id,
        helm:      v.missing_helm  ? '✗' : '✓',
        vest:      v.missing_vest  ? '✗' : '✓',
        shoes:     v.missing_shoes ? '✗' : '✓',
        color:     v.helm_color_detected ?? '—',
        personnel: names || '—',
      })
    })
    ws2.getRow(1).font = { bold: true }
    ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0FF' } }

    // ── Sheet 3: Karyawan Paling Sering Melanggar ─────────────────────────
    const ws3 = wb.addWorksheet('Top Pelanggar')
    ws3.columns = [
      { header: 'Nama',         key: 'name',  width: 30 },
      { header: 'ID Karyawan',  key: 'eid',   width: 16 },
      { header: 'Departemen',   key: 'dept',  width: 20 },
      { header: 'Jml Violation',key: 'count', width: 16 },
      { header: 'SP Aktif',     key: 'sp',    width: 14 },
    ]
    const top = await this.getTopOffenders(10, dateFrom, dateTo)
    // Fallback info for dept and sp since they are not in getTopOffenders
    top.forEach((p: any) => ws3.addRow({
      name:  p.full_name, eid: p.employee_id, dept: p.department ?? '—',
      count: p.violation_count, sp: p.active_sp?.level ?? '—',
    }))
    ws3.getRow(1).font = { bold: true }
    ws3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0FF' } }

    return Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer)
  }

  private _generatePdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margins: { top:50, bottom:50, left:60, right:60 } });
        const chunks: Buffer[] = [];
        const stream = new PassThrough();
        
        doc.pipe(stream);
        stream.on('data', chunk => chunks.push(chunk));
        
        doc.on('pageAdded', () => {
          doc.fontSize(10).text(
            `SiMAPD v1.0 — Halaman ${doc.bufferedPageRange().count}`, 
            50, doc.page.height - 50, 
            { align: 'center' }
          );
        });

        // Halaman 1 — Cover
        doc.fontSize(24).text('Laporan Kepatuhan APD (SiMAPD)', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Periode: ${data.dateFrom} s/d ${data.dateTo}`, { align: 'center' });
        doc.text(`Tanggal Cetak: ${new Date().toISOString().slice(0,10)}`, { align: 'center' });
        
        doc.fontSize(10).text(`SiMAPD v1.0 — Halaman 1`, 50, doc.page.height - 50, { align: 'center' });
        
        // Halaman 2 — Ringkasan
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

        // Halaman 3 — Tren
        doc.addPage();
        doc.fontSize(18).text('Tren Kepatuhan (7 Hari Terakhir)', { underline: true });
        doc.moveDown();
        for (const t of data.trend) {
          doc.fontSize(12).text(`${t.date} : ${t.total_violations} Pelanggaran (Kepatuhan: ${t.compliance_rate}%)`);
        }

        // Halaman 4 — APD & Shift
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

        // Halaman 5 — Top Offenders
        doc.addPage();
        doc.fontSize(18).text('Top 10 Pelanggar', { underline: true });
        doc.moveDown();
        for (const [idx, o] of data.offenders.entries()) {
          doc.fontSize(12).text(`${idx+1}. ${o.full_name} (ID: ${o.employee_id}) - ${o.role}: ${o.violation_count} kali pelanggaran`);
        }

        doc.end();
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', err => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }
}
