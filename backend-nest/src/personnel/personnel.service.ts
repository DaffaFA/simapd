import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { Personnel } from './entities/personnel.entity';
import { SpService } from '../sp/sp.service';
import { SpRecord } from '../sp/entities/sp-record.entity';
import { Violation } from '../violations/entities/violation.entity';
import { PersonnelFilterDto } from './dto/personnel-filter.dto';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { PersonnelResponseDto } from './dto/personnel-response.dto';

@Injectable()
export class PersonnelService {
  constructor(
    @InjectRepository(Personnel) private repo: Repository<Personnel>,
    @InjectRepository(Violation) private violationRepo: Repository<Violation>,
    private spService: SpService,
  ) {}

  async findAll(filter: PersonnelFilterDto): Promise<[PersonnelResponseDto[], number]> {
    const qb = this.repo.createQueryBuilder('p');
    if (filter.search) {
      qb.andWhere('(p.full_name ILIKE :s OR p.employee_id ILIKE :s)', { s: `%${filter.search}%` });
    }
    if (filter.role) qb.andWhere('p.role = :r', { r: filter.role });
    if (filter.is_active !== undefined) qb.andWhere('p.is_active = :a', { a: filter.is_active });
    
    qb.orderBy('p.full_name', 'ASC')
      .skip(((filter.page ?? 1) - 1) * (filter.page_size ?? 20))
      .take(filter.page_size ?? 20);
      
    const [items, total] = await qb.getManyAndCount();
    const dtos = await Promise.all(items.map(p => this.toDto(p)));
    return [dtos, total];
  }

  async findOne(id: string): Promise<PersonnelResponseDto> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Personel tidak ditemukan');
    return this.toDto(p);
  }

  async create(dto: CreatePersonnelDto): Promise<PersonnelResponseDto> {
    const exists = await this.repo.findOne({ where: { employee_id: dto.employee_id } });
    if (exists) throw new ConflictException('Employee ID sudah terdaftar');
    return this.toDto(await this.repo.save(this.repo.create(dto)));
  }

  async update(id: string, dto: UpdatePersonnelDto): Promise<PersonnelResponseDto> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException();
    return this.toDto(await this.repo.save(Object.assign(p, dto)));
  }

  async softDelete(id: string): Promise<void> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException();
    p.is_active = false;
    await this.repo.save(p);
  }

  async exportProfile(id: string): Promise<Buffer> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Personel tidak ditemukan');

    const violations = await this.violationRepo
      .createQueryBuilder('v')
      .leftJoin('v.links', 'vl')
      .where('(v.personnel_id = :pid OR vl.personnel_id = :pid)', { pid: id })
      .orderBy('v.detected_at', 'DESC')
      .getMany();

    const spRecords = await this.spService.findAll(id);

    return this._generateProfilePdf(p, violations, spRecords);
  }

  private _generateProfilePdf(
    p: Personnel,
    violations: Violation[],
    spRecords: SpRecord[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];
        const stream = new PassThrough();

        doc.pipe(stream);
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));

        const left = doc.page.margins.left;
        const right = doc.page.width - doc.page.margins.right;
        const contentWidth = right - left;
        const bottomLimit = doc.page.height - doc.page.margins.bottom;

        const ensureSpace = (needed: number): boolean => {
          if (doc.y + needed > bottomLimit) {
            doc.addPage();
            return true;
          }
          return false;
        };

        // ── Header ─────────────────────────────────────────────────────────────
        doc.font('Helvetica-Bold').fontSize(16).text('PROFIL KARYAWAN', { align: 'center' });
        doc.font('Helvetica').fontSize(9).text('SiMAPD — Sistem Monitoring APD', { align: 'center' });
        doc.fontSize(8).text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });
        doc.moveDown(0.8);
        doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
        doc.moveDown(0.8);

        // ── Informasi Karyawan ────────────────────────────────────────────────
        const activeSp = spRecords.find((sp) => sp.is_active);
        doc.font('Helvetica-Bold').fontSize(12).text('Informasi Karyawan');
        doc.moveDown(0.4);
        doc.fontSize(10);
        const info: [string, string][] = [
          ['Nama Lengkap', p.full_name],
          ['ID Karyawan', p.employee_id],
          ['Jabatan', p.role],
          ['Departemen', p.department],
          ['Warna Helm', p.helm_color],
          ['Email', p.email ?? '—'],
          ['Status', p.is_active ? 'Aktif' : 'Non-aktif'],
          [
            'SP Aktif',
            activeSp
              ? `${activeSp.level} (berlaku s/d ${new Date(activeSp.expires_at).toLocaleDateString('id-ID')})`
              : '—',
          ],
          ['Total Pelanggaran', `${violations.length}`],
        ];
        info.forEach(([k, v]) => {
          doc.font('Helvetica-Bold').text(`${k.padEnd(16)} :  `, { continued: true });
          doc.font('Helvetica').text(v);
        });
        doc.moveDown(1);

        // ── Riwayat Surat Peringatan ─────────────────────────────────────────
        doc.font('Helvetica-Bold').fontSize(12).text('Riwayat Surat Peringatan');
        doc.moveDown(0.4);
        if (spRecords.length === 0) {
          doc.font('Helvetica').fontSize(10).text('Tidak ada surat peringatan.');
        } else {
          const spCols = [
            { label: 'Level', width: 50 },
            { label: 'Nomor', width: 140 },
            { label: 'Diterbitkan', width: 90 },
            { label: 'Berlaku s/d', width: 90 },
            { label: 'Status', width: contentWidth - 50 - 140 - 90 - 90 },
          ];
          this._drawTableHeader(doc, spCols, left);
          spRecords.forEach((sp) => {
            if (ensureSpace(18)) this._drawTableHeader(doc, spCols, left);
            this._drawTableRow(doc, spCols, left, [
              sp.level,
              sp.sp_number,
              new Date(sp.issued_at).toLocaleDateString('id-ID'),
              new Date(sp.expires_at).toLocaleDateString('id-ID'),
              sp.is_active ? 'Aktif' : 'Selesai',
            ]);
          });
        }
        doc.moveDown(1);

        // ── Riwayat Pelanggaran APD ────────────────────────────────────────
        ensureSpace(60);
        doc.font('Helvetica-Bold').fontSize(12).text('Riwayat Pelanggaran APD');
        doc.moveDown(0.4);
        if (violations.length === 0) {
          doc.font('Helvetica').fontSize(10).text('Tidak ada riwayat pelanggaran.');
        } else {
          const vCols = [
            { label: 'Kode', width: 90 },
            { label: 'Waktu', width: 110 },
            { label: 'Kamera', width: 70 },
            { label: 'Shift', width: 50 },
            { label: 'APD Hilang', width: contentWidth - 90 - 110 - 70 - 50 },
          ];
          this._drawTableHeader(doc, vCols, left);
          violations.forEach((v) => {
            if (ensureSpace(18)) this._drawTableHeader(doc, vCols, left);
            const missing =
              [v.missing_helm && 'Helm', v.missing_vest && 'Rompi', v.missing_shoes && 'Sepatu']
                .filter(Boolean)
                .join(', ') || '—';
            this._drawTableRow(doc, vCols, left, [
              v.violation_code,
              new Date(v.detected_at).toLocaleString('id-ID'),
              v.camera_id,
              v.shift,
              missing,
            ]);
          });
        }

        doc.end();
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  private _drawTableHeader(
    doc: PDFKit.PDFDocument,
    cols: { label: string; width: number }[],
    left: number,
  ) {
    doc.font('Helvetica-Bold').fontSize(9);
    let x = left;
    const y = doc.y;
    cols.forEach((c) => {
      doc.text(c.label, x, y, { width: c.width, ellipsis: true });
      x += c.width;
    });
    doc.moveDown(0.3);
    doc
      .moveTo(left, doc.y)
      .lineTo(
        left + cols.reduce((s, c) => s + c.width, 0),
        doc.y,
      )
      .stroke();
    doc.moveDown(0.3);
  }

  private _drawTableRow(
    doc: PDFKit.PDFDocument,
    cols: { label: string; width: number }[],
    left: number,
    values: string[],
  ) {
    doc.font('Helvetica').fontSize(9);
    const y = doc.y;
    const rowHeight = Math.max(
      ...cols.map((c, i) => doc.heightOfString(values[i] ?? '', { width: c.width })),
    );
    let x = left;
    cols.forEach((c, i) => {
      doc.text(values[i] ?? '', x, y, { width: c.width, ellipsis: true });
      x += c.width;
    });
    doc.y = y + rowHeight + 4;
  }

  private async toDto(p: Personnel): Promise<PersonnelResponseDto> {
    try {
      await this.spService.checkAndAutoIssueSp(p.id, 'System');
    } catch (e) {
      console.error(`Auto SP check failed for personnel ${p.id}:`, e);
    }
    const [vCount, activeSp, cooldownUntil] = await Promise.all([
      this.spService.countViolationsForPersonnel(p.id),
      this.spService.getActiveSp(p.id),
      this.spService.getCooldownUntil(p.id),
    ]);
    return {
      ...p,
      violation_count: vCount,
      active_sp: activeSp?.level ?? null,
      cooldown_until: cooldownUntil,
    };
  }
}
