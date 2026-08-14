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
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    const [today, linkedToday, week, sps] = await Promise.all([
      this.violationRepo.count({ where: { detected_at: Between(start, end) } }),
      this.violationRepo.count({
        where: {
          detected_at: Between(start, end),
          personnel_id: Not(IsNull()),
        },
      }),
      this.violationRepo.count({
        where: {
          detected_at: MoreThanOrEqual(new Date(Date.now() - 7 * 86400000)),
        },
      }),
      this.spRepo.find({ where: { is_active: true } }),
    ]);

    const now = new Date();
    const active = sps.filter((s) => s.expires_at > now);

    return {
      compliance_rate: this._estimateRate(today),
      total_violations_today: today,
      total_violations_week: week,
      linked_count: linkedToday,
      unlinked_count: today - linkedToday,
      active_sp_count: active.length,
      sp1_count: active.filter((s) => s.level === 'SP1').length,
      sp2_count: active.filter((s) => s.level === 'SP2').length,
      sp3_count: active.filter((s) => s.level === 'SP3').length,
    };
  }

  private _estimateRate(violations: number): number {
    // MVP: asumsi total detections per hari = violations * 4 (minimum 50)
    // Ganti dengan counter aktual jika tersedia
    const est = Math.max(violations * 4, 50);
    return Math.round((1 - violations / est) * 1000) / 10;
  }

  async getDailyTrend(days = 7) {
    return Promise.all(
      Array.from({ length: days }, (_, i) => days - 1 - i).map(
        async (offset) => {
          const d = new Date();
          d.setDate(d.getDate() - offset);
          const s = new Date(d);
          s.setHours(0, 0, 0, 0);
          const e = new Date(d);
          e.setHours(23, 59, 59, 999);
          const total = await this.violationRepo.count({
            where: { detected_at: Between(s, e) },
          });
          return {
            date: d.toISOString().slice(0, 10),
            total_violations: total,
            compliance_rate: this._estimateRate(total),
          };
        },
      ),
    );
  }

  async getByType(dateFrom?: string, dateTo?: string) {
    const base = this.violationRepo.createQueryBuilder('v');
    if (dateFrom)
      base.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
    if (dateTo) base.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });

    const [helm, vest, shoes] = await Promise.all([
      base.clone().andWhere('v.missing_helm = true').getCount(),
      base.clone().andWhere('v.missing_vest = true').getCount(),
      base.clone().andWhere('v.missing_shoes = true').getCount(),
    ]);

    const total = helm + vest + shoes || 1;
    return {
      helm,
      vest,
      shoes,
      helm_pct: Math.round((helm / total) * 1000) / 10,
      vest_pct: Math.round((vest / total) * 1000) / 10,
      shoes_pct: Math.round((shoes / total) * 1000) / 10,
    };
  }

  async getByShift(dateFrom?: string, dateTo?: string) {
    const qb = this.violationRepo
      .createQueryBuilder('v')
      .select('v.shift', 'shift')
      .addSelect('COUNT(*)', 'count');
    if (dateFrom)
      qb.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
    if (dateTo) qb.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });

    const rows = await qb.groupBy('v.shift').getRawMany();
    const map = Object.fromEntries(
      rows.map((r) => [r.shift, parseInt(r.count)]),
    );
    return {
      pagi: map['Pagi'] ?? 0,
      siang: map['Siang'] ?? 0,
      malam: map['Malam'] ?? 0,
    };
  }

  async getTopOffenders(limit = 10, dateFrom?: string, dateTo?: string) {
    const qb = this.violationRepo
      .createQueryBuilder('v')
      .select('v.personnel_id', 'id')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('v.personnel', 'p')
      .addSelect('p.full_name', 'name')
      .addSelect('p.employee_id', 'emp_id')
      .addSelect('p.role', 'role')
      .where('v.personnel_id IS NOT NULL');

    if (dateFrom)
      qb.andWhere('v.detected_at >= :df', { df: new Date(dateFrom) });
    if (dateTo) qb.andWhere('v.detected_at <= :dt', { dt: new Date(dateTo) });

    const rows = await qb
      .groupBy('v.personnel_id,p.full_name,p.employee_id,p.role')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((r) => ({
      personnel_id: r.id,
      full_name: r.name,
      employee_id: r.emp_id,
      role: r.role,
      violation_count: parseInt(r.count),
    }));
  }

  async exportCsv(filter: AnalyticsQueryDto): Promise<string> {
    const qb = this.violationRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.personnel', 'p');
    if (filter.date_from)
      qb.andWhere('v.detected_at >= :df', { df: new Date(filter.date_from) });
    if (filter.date_to)
      qb.andWhere('v.detected_at <= :dt', { dt: new Date(filter.date_to) });
    if (filter.shift) qb.andWhere('v.shift = :sh', { sh: filter.shift });

    const rows = await qb.orderBy('v.detected_at', 'DESC').getMany();
    const header =
      'Kode,Waktu,Shift,Track ID,Kamera,Helm,Role,Missing Helm,Missing Rompi,Missing Sepatu,Personel\n';
    const body = rows
      .map((v) =>
        [
          v.violation_code,
          v.detected_at.toISOString(),
          v.shift,
          v.track_id,
          v.camera_id,
          v.helm_color_detected,
          v.role_detected,
          v.missing_helm ? 'Ya' : 'Tidak',
          v.missing_vest ? 'Ya' : 'Tidak',
          v.missing_shoes ? 'Ya' : 'Tidak',
          v.personnel?.full_name ?? '-',
        ].join(','),
      )
      .join('\n');
    return header + body;
  }

  private dateWhere(dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
      const to = dateTo ? new Date(dateTo) : new Date();
      to.setHours(23, 59, 59, 999); // sampai akhir hari
      where.detected_at = Between(from, to);
    }
    return where;
  }

  async exportPdf(dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const from =
      dateFrom ??
      new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = dateTo ?? new Date().toISOString().slice(0, 10);
    const [summary, trend, byType, byShift, offenders] = await Promise.all([
      this.getDashboardSummary(),
      this.getDailyTrend(7),
      this.getByType(from, to),
      this.getByShift(from, to),
      this.getTopOffenders(10, from, to),
    ]);
    return this._generatePdf({
      summary,
      trend,
      byType,
      byShift,
      offenders,
      dateFrom: from,
      dateTo: to,
    });
  }

  async exportExcel(dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SiMAPD';
    wb.created = new Date();

    const where = this.dateWhere(dateFrom, dateTo);
    const violations = await this.violationRepo.find({
      where,
      order: { detected_at: 'DESC' },
      relations: { links: { personnel: true }, personnel: true },
    });

    // ── Sheet 1: Ringkasan ─────────────────────────────────────────────────
    const ws1 = wb.addWorksheet('Ringkasan');
    ws1.columns = [
      { header: 'Keterangan', key: 'label', width: 35 },
      { header: 'Nilai', key: 'value', width: 20 },
    ];
    const total = violations.length;
    const noHelm = violations.filter((v) => v.missing_helm).length;
    const noVest = violations.filter((v) => v.missing_vest).length;
    const noShoes = violations.filter((v) => v.missing_shoes).length;
    const linked = violations.filter(
      (v) => v.personnel_id || (v.links && v.links.length > 0),
    ).length;
    ws1.addRows([
      {
        label: 'Periode',
        value: `${dateFrom ?? 'Semua'} – ${dateTo ?? 'Semua'}`,
      },
      { label: 'Total Pelanggaran', value: total },
      { label: 'Tanpa Helm', value: noHelm },
      { label: 'Tanpa Rompi', value: noVest },
      { label: 'Tanpa Sepatu', value: noShoes },
      { label: 'Pelanggaran Terhubung ke Karyawan', value: linked },
      { label: 'Pelanggaran Belum Terhubung', value: total - linked },
    ]);
    ws1.getRow(1).font = { bold: true };
    ws1.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE3F0FF' },
    };

    // ── Sheet 2: Detail Pelanggaran ────────────────────────────────────────
    const ws2 = wb.addWorksheet('Detail Pelanggaran');
    ws2.columns = [
      { header: 'Kode', key: 'code', width: 20 },
      { header: 'Tanggal', key: 'date', width: 22 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'Kamera', key: 'cam', width: 18 },
      { header: 'Track ID', key: 'track', width: 10 },
      { header: 'Tanpa Helm', key: 'helm', width: 14 },
      { header: 'Tanpa Rompi', key: 'vest', width: 14 },
      { header: 'Tanpa Sepatu', key: 'shoes', width: 14 },
      { header: 'Warna Helm', key: 'color', width: 14 },
      { header: 'Karyawan', key: 'personnel', width: 30 },
    ];
    violations.forEach((v) => {
      let names = v.personnel?.full_name;
      if (!names && v.links?.length > 0) {
        names = v.links
          .map((l) => l.personnel?.full_name)
          .filter(Boolean)
          .join(', ');
      }
      ws2.addRow({
        code: v.violation_code,
        date: new Date(v.detected_at).toLocaleString('id-ID'),
        shift: v.shift,
        cam: v.camera_id,
        track: v.track_id,
        helm: v.missing_helm ? '✗' : '✓',
        vest: v.missing_vest ? '✗' : '✓',
        shoes: v.missing_shoes ? '✗' : '✓',
        color: v.helm_color_detected ?? '—',
        personnel: names || '—',
      });
    });
    ws2.getRow(1).font = { bold: true };
    ws2.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE3F0FF' },
    };

    // ── Sheet 3: Karyawan Paling Sering Melanggar ─────────────────────────
    const ws3 = wb.addWorksheet('Top Pelanggar');
    ws3.columns = [
      { header: 'Nama', key: 'name', width: 30 },
      { header: 'ID Karyawan', key: 'eid', width: 16 },
      { header: 'Departemen', key: 'dept', width: 20 },
      { header: 'Jml Violation', key: 'count', width: 16 },
      { header: 'SP Aktif', key: 'sp', width: 14 },
    ];
    const top = await this.getTopOffenders(10, dateFrom, dateTo);
    // Fallback info for dept and sp since they are not in getTopOffenders
    top.forEach((p: any) =>
      ws3.addRow({
        name: p.full_name,
        eid: p.employee_id,
        dept: p.department ?? '—',
        count: p.violation_count,
        sp: p.active_sp?.level ?? '—',
      }),
    );
    ws3.getRow(1).font = { bold: true };
    ws3.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE3F0FF' },
    };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /**
   * Laporan ringkas 2 halaman (bukan 1 halaman per section seperti versi
   * lama). Halaman 1 mereplikasi chart-chart di halaman Analytics frontend
   * (tren kepatuhan, distribusi APD, distribusi shift) sebagai vector shape
   * pdfkit — tidak ada dependency baru (canvas/puppeteer) yang dibutuhkan.
   */
  private _generatePdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 50, right: 50 },
        });
        const chunks: Buffer[] = [];
        const stream = new PassThrough();

        doc.pipe(stream);
        stream.on('data', (chunk) => chunks.push(chunk));

        const left = doc.page.margins.left;
        const contentWidth =
          doc.page.width - doc.page.margins.left - doc.page.margins.right;

        let pageNum = 0;
        const newPage = (): number => {
          if (pageNum > 0) doc.addPage();
          pageNum += 1;
          // Text drawn AT maxY still overflows it by one line-height and
          // silently triggers pdfkit's own auto-pagination — back off by a
          // full line so the footer stays inside the printable area.
          const footerY = doc.page.maxY() - 12;
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#94A3B8')
            .text(`SiMAPD v1.0 — Halaman ${pageNum}`, left, footerY, {
              width: contentWidth,
              align: 'center',
              lineBreak: false,
            });
          return doc.page.margins.top;
        };

        // ═══ Halaman 1 — Ringkasan & Grafik ═══════════════════════════════
        let y = newPage();

        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor('#111827')
          .text('Laporan Kepatuhan APD (SiMAPD)', left, y);
        y += 24;
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#64748B')
          .text(
            `Periode: ${data.dateFrom} s/d ${data.dateTo}   ·   Dicetak: ${new Date().toISOString().slice(0, 10)}`,
            left,
            y,
          );
        y += 26;

        y = this._drawKpiRow(
          doc,
          [
            {
              label: 'TINGKAT KEPATUHAN',
              value: `${data.summary.compliance_rate}%`,
              color: '#22C55E',
            },
            {
              label: 'PELANGGARAN HARI INI',
              value: `${data.summary.total_violations_today}`,
              color: '#EF4444',
            },
            {
              label: 'PELANGGARAN PEKAN INI',
              value: `${data.summary.total_violations_week}`,
              color: '#F97316',
            },
            {
              label: 'SP AKTIF',
              value: `${data.summary.active_sp_count}`,
              color: '#3B82F6',
              sub: `SP1 ${data.summary.sp1_count} · SP2 ${data.summary.sp2_count} · SP3 ${data.summary.sp3_count}`,
            },
          ],
          left,
          y,
          contentWidth,
        );
        y += 10;

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#94A3B8')
          .text(
            `Terhubung ke Personel: ${data.summary.linked_count}   ·   Belum Terhubung: ${data.summary.unlinked_count}`,
            left,
            y,
          );
        y += 24;

        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#111827')
          .text('Tren Kepatuhan (7 Hari Terakhir)', left, y);
        y += 18;
        y = this._drawTrendChart(doc, data.trend, left, y, contentWidth, 110);
        y += 18;

        const colGap = 16;
        const colWidth = (contentWidth - colGap) / 2;
        this._drawHorizontalBars(
          doc,
          'Distribusi per Jenis APD',
          [
            { label: 'Rompi', pct: data.byType.vest_pct, color: '#EF4444' },
            { label: 'Helm', pct: data.byType.helm_pct, color: '#F59E0B' },
            { label: 'Sepatu', pct: data.byType.shoes_pct, color: '#3B82F6' },
          ],
          left,
          y,
          colWidth,
        );

        const shiftTotal =
          data.byShift.pagi + data.byShift.siang + data.byShift.malam || 1;
        const shiftBars = [
          {
            label: 'Pagi (07–15)',
            pct: Math.round((data.byShift.pagi / shiftTotal) * 100),
            color: '#F97316',
          },
          {
            label: 'Siang (15–23)',
            pct: Math.round((data.byShift.siang / shiftTotal) * 100),
            color: '#F59E0B',
          },
          {
            label: 'Malam (23–07)',
            pct: Math.round((data.byShift.malam / shiftTotal) * 100),
            color: '#3B82F6',
          },
        ];
        const highestShift = shiftBars.reduce((a, b) =>
          b.pct > a.pct ? b : a,
        ).label;
        this._drawHorizontalBars(
          doc,
          'Distribusi per Shift',
          shiftBars,
          left + colWidth + colGap,
          y,
          colWidth,
          `Tertinggi: ${highestShift}`,
        );

        // ═══ Halaman 2 — Top Pelanggar ═════════════════════════════════════
        y = newPage();
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor('#111827')
          .text('Top 10 Pelanggar', left, y);
        y += 22;
        this._drawOffendersTable(doc, data.offenders, left, y, contentWidth);

        doc.end();
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  private _drawKpiRow(
    doc: PDFKit.PDFDocument,
    kpis: { label: string; value: string; color: string; sub?: string }[],
    x: number,
    y: number,
    width: number,
  ): number {
    const gap = 10;
    const boxHeight = 54;
    const boxWidth = (width - gap * (kpis.length - 1)) / kpis.length;

    kpis.forEach((kpi, i) => {
      const bx = x + i * (boxWidth + gap);
      doc
        .roundedRect(bx, y, boxWidth, boxHeight, 4)
        .fillAndStroke('#F8FAFC', '#E2E8F0');
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748B')
        .text(kpi.label, bx + 8, y + 8, { width: boxWidth - 16 });
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(kpi.color)
        .text(kpi.value, bx + 8, y + 20, { width: boxWidth - 16 });
      if (kpi.sub) {
        doc
          .font('Helvetica')
          .fontSize(6.5)
          .fillColor('#94A3B8')
          .text(kpi.sub, bx + 8, y + 42, { width: boxWidth - 16 });
      }
    });

    return y + boxHeight;
  }

  /** Bar chart tren kepatuhan — meniru BarChart recharts di halaman Analytics. */
  private _drawTrendChart(
    doc: PDFKit.PDFDocument,
    trend: { date: string; compliance_rate: number }[],
    x: number,
    y: number,
    width: number,
    height: number,
  ): number {
    if (!trend || trend.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#94A3B8')
        .text('Belum ada data tren', x, y);
      return y + 20;
    }

    const gap = 6;
    const barWidth = (width - gap * (trend.length - 1)) / trend.length;
    const baseline = y + height;

    doc
      .moveTo(x, baseline)
      .lineTo(x + width, baseline)
      .strokeColor('#E2E8F0')
      .lineWidth(1)
      .stroke();

    trend.forEach((t, i) => {
      const bx = x + i * (barWidth + gap);
      const barHeight = Math.max(2, (t.compliance_rate / 100) * height);
      const isLast = i === trend.length - 1;
      // Warna & opacity sama seperti Cell di frontend: bar terakhir selalu
      // oranye (fokus "hari ini"), sebelumnya hijau jika >=78% kepatuhan.
      const color = isLast
        ? '#F97316'
        : t.compliance_rate >= 78
          ? '#22C55E'
          : '#F97316';

      doc
        .rect(bx, baseline - barHeight, barWidth, barHeight)
        .fillOpacity(isLast ? 1 : 0.75)
        .fill(color)
        .fillOpacity(1);

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#64748B')
        .text(`${t.compliance_rate}%`, bx, baseline - barHeight - 10, {
          width: barWidth,
          align: 'center',
        });

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#64748B')
        .text(t.date.slice(5), bx, baseline + 4, {
          width: barWidth,
          align: 'center',
        });
    });

    return baseline + 16;
  }

  /** Horizontal progress bars — meniru komponen HorizontalBar di frontend. */
  private _drawHorizontalBars(
    doc: PDFKit.PDFDocument,
    title: string,
    items: { label: string; pct: number; color: string }[],
    x: number,
    y: number,
    width: number,
    note?: string,
  ): number {
    let cy = y;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#111827')
      .text(title, x, cy, { width });
    cy += 16;

    const trackHeight = 5;
    for (const item of items) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748B')
        .text(item.label, x, cy, { width: width - 40 });
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(item.color)
        .text(`${item.pct}%`, x + width - 40, cy, {
          width: 40,
          align: 'right',
        });
      cy += 12;

      doc
        .roundedRect(x, cy, width, trackHeight, trackHeight / 2)
        .fill('#E2E8F0');
      const fillWidth = Math.max(0, Math.min(width, (item.pct / 100) * width));
      if (fillWidth > 0) {
        doc
          .roundedRect(x, cy, fillWidth, trackHeight, trackHeight / 2)
          .fill(item.color);
      }
      cy += trackHeight + 10;
    }

    if (note) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#F97316')
        .text(note, x, cy, { width });
      cy += 12;
    }

    return cy;
  }

  private _drawOffendersTable(
    doc: PDFKit.PDFDocument,
    offenders: {
      full_name: string;
      employee_id: string;
      role: string;
      violation_count: number;
    }[],
    x: number,
    y: number,
    width: number,
  ): number {
    const colRank = 24;
    const colCount = 70;
    const colRole = 140;
    const colName = width - colRank - colCount - colRole;
    const rowHeight = 20;

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748B');
    doc.text('#', x, y, { width: colRank });
    doc.text('NAMA', x + colRank, y, { width: colName });
    doc.text('PERAN', x + colRank + colName, y, { width: colRole });
    doc.text('PELANGGARAN', x + colRank + colName + colRole, y, {
      width: colCount,
      align: 'right',
    });
    y += 14;
    doc
      .moveTo(x, y)
      .lineTo(x + width, y)
      .strokeColor('#E2E8F0')
      .lineWidth(1)
      .stroke();
    y += 6;

    if (!offenders || offenders.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#94A3B8')
        .text('Belum ada data pelanggar', x, y);
      return y + 20;
    }

    offenders.forEach((o, i) => {
      const countColor =
        o.violation_count >= 7
          ? '#EF4444'
          : o.violation_count >= 3
            ? '#F59E0B'
            : '#22C55E';
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#111827')
        .text(`${i + 1}`, x, y, { width: colRank });
      doc
        .font('Helvetica-Bold')
        .text(o.full_name, x + colRank, y, { width: colName });
      doc
        .font('Helvetica')
        .fillColor('#64748B')
        .text(`${o.role} (${o.employee_id})`, x + colRank + colName, y, {
          width: colRole,
        });
      doc
        .font('Helvetica-Bold')
        .fillColor(countColor)
        .text(`${o.violation_count}`, x + colRank + colName + colRole, y, {
          width: colCount,
          align: 'right',
        });
      y += rowHeight;
    });

    return y;
  }
}
