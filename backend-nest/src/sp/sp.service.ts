import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { SpRecord } from './entities/sp-record.entity';
import { SpConfig } from './entities/sp-config.entity';
import { Violation } from '../violations/entities/violation.entity';
import { ViolationLink } from '../violations/entities/violation-link.entity';
import { Personnel } from '../personnel/entities/personnel.entity';
import { IssueSpDto } from './dto/issue-sp.dto';
import { SpConfigUpdateDto } from './dto/sp-config-update.dto';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SpService {
  // Berapa lama seorang personnel harus menunggu sebelum bisa di-link ke
  // violation lain lagi setelah link terakhirnya (cegah operator menumpuk
  // banyak violation ke orang yang sama dalam waktu singkat).
  static readonly LINK_COOLDOWN_HOURS = 24;

  constructor(
    @InjectRepository(SpRecord) private spRepo: Repository<SpRecord>,
    @InjectRepository(SpConfig) private cfgRepo: Repository<SpConfig>,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  /** Waktu link terakhir personnel ini ke violation manapun, atau null kalau belum pernah. */
  async getLastLinkedAt(personnelId: string): Promise<Date | null> {
    const link = await this.spRepo.manager
      .createQueryBuilder(ViolationLink, 'vl')
      .where('vl.personnel_id = :pid', { pid: personnelId })
      .orderBy('vl.linked_at', 'DESC')
      .getOne();
    return link?.linked_at ?? null;
  }

  /** Kapan cooldown personnel ini berakhir, atau null kalau tidak sedang cooldown. */
  async getCooldownUntil(personnelId: string): Promise<Date | null> {
    const lastLinkedAt = await this.getLastLinkedAt(personnelId);
    if (!lastLinkedAt) return null;
    const cooldownUntil = new Date(
      lastLinkedAt.getTime() + SpService.LINK_COOLDOWN_HOURS * 60 * 60 * 1000,
    );
    return cooldownUntil > new Date() ? cooldownUntil : null;
  }

  async getActiveSp(personnelId: string): Promise<SpRecord | null> {
    const now = new Date();
    const records = await this.spRepo.find({
      where: { personnel_id: personnelId, is_active: true },
    });
    const active = records.filter((r) => r.expires_at > now);
    if (!active.length) return null;
    const order: Record<string, number> = { SP3: 3, SP2: 2, SP1: 1 };
    return active.sort((a, b) => order[b.level] - order[a.level])[0];
  }

  async countViolationsForPersonnel(personnelId: string): Promise<number> {
    return this.spRepo.manager
      .createQueryBuilder(Violation, 'v')
      .leftJoin('v.links', 'vl')
      .where('(v.personnel_id = :pid OR vl.personnel_id = :pid)', {
        pid: personnelId,
      })
      .getCount();
  }

  async checkAndAutoIssueSp(
    personnelId: string,
    issuedBy: string,
    triggerViolationId?: string,
  ): Promise<SpRecord | null> {
    const [config, violationCount, currentSp] = await Promise.all([
      this.getConfig(),
      this.countViolationsForPersonnel(personnelId),
      this.getActiveSp(personnelId),
    ]);
    const required = this.computeRequiredLevel(violationCount, config);
    if (!required) return null;
    const order: Record<string, number> = { SP1: 1, SP2: 2, SP3: 3 };
    if (currentSp && order[currentSp.level] >= order[required])
      return currentSp;

    if (currentSp) {
      currentSp.is_active = false;
      await this.spRepo.save(currentSp);
    }

    const durKey = `${required.toLowerCase()}_duration_days` as keyof SpConfig;
    const durationDays = config[durKey] as number;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const personnel = await this.spRepo.manager.findOne(Personnel, {
      where: { id: personnelId },
    });
    const spCount = await this.spRepo.count({
      where: { personnel_id: personnelId },
    });

    return this.spRepo.save(
      this.spRepo.create({
        sp_number: `SP-${personnel?.employee_id ?? personnelId.slice(0, 6)}-${String(spCount + 1).padStart(3, '0')}`,
        personnel_id: personnelId,
        level: required,
        issued_at: new Date(),
        expires_at: expiresAt,
        is_active: true,
        violation_count_at_issuance: violationCount,
        issued_by: issuedBy,
        trigger_violation_id: triggerViolationId,
      }),
    );
  }

  private computeRequiredLevel(
    count: number,
    cfg: SpConfig,
  ): 'SP1' | 'SP2' | 'SP3' | null {
    if (count >= cfg.sp3_threshold) return 'SP3';
    if (count >= cfg.sp2_threshold) return 'SP2';
    if (count >= cfg.sp1_threshold) return 'SP1';
    return null;
  }

  async issueManual(dto: IssueSpDto, issuedBy: string): Promise<SpRecord> {
    const currentSp = await this.getActiveSp(dto.personnel_id);
    if (currentSp) {
      currentSp.is_active = false;
      await this.spRepo.save(currentSp);
    }
    const cfg = await this.getConfig();
    const durKey = `${dto.level.toLowerCase()}_duration_days` as keyof SpConfig;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (cfg[durKey] as number));
    const violationCount = await this.countViolationsForPersonnel(
      dto.personnel_id,
    );

    return this.spRepo.save(
      this.spRepo.create({
        sp_number: `SP-MANUAL-${Date.now()}`,
        personnel_id: dto.personnel_id,
        level: dto.level,
        issued_at: new Date(),
        expires_at: expiresAt,
        is_active: true,
        violation_count_at_issuance: violationCount,
        issued_by: issuedBy,
        notes: dto.notes,
      }),
    );
  }

  async revoke(spId: string, revokedBy: string): Promise<SpRecord> {
    const sp = await this.spRepo.findOne({ where: { id: spId } });
    if (!sp) throw new NotFoundException();
    sp.is_active = false;
    sp.revoked_at = new Date();
    sp.revoked_by = revokedBy;
    return this.spRepo.save(sp);
  }

  async getConfig(): Promise<SpConfig> {
    const cfg = await this.cfgRepo.findOne({ where: { is_active: true } });
    if (!cfg)
      throw new InternalServerErrorException('SP config tidak ditemukan');
    return cfg;
  }

  async updateConfig(
    dto: SpConfigUpdateDto,
    updatedBy: string,
  ): Promise<SpConfig> {
    const cfg = await this.getConfig();
    Object.assign(cfg, dto);
    cfg.updated_by = updatedBy;
    return this.cfgRepo.save(cfg);
  }

  async findActiveAll(
    page: number,
    pageSize: number,
  ): Promise<[SpRecord[], number]> {
    return this.spRepo.findAndCount({
      where: { is_active: true },
      relations: { personnel: true },
      order: { issued_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findAll(personnelId?: string): Promise<SpRecord[]> {
    const where = personnelId ? { personnel_id: personnelId } : {};
    return this.spRepo.find({
      where,
      order: { issued_at: 'DESC' },
      relations: { personnel: true },
    });
  }

  async expireOutdated(): Promise<number> {
    const result = await this.spRepo
      .createQueryBuilder()
      .update(SpRecord)
      .set({ is_active: false })
      .where('is_active = true AND expires_at < NOW()')
      .execute();
    return result.affected ?? 0;
  }

  /** Ambil bytes foto violation dari RustFS (frame_key) atau disk lokal (frame_path, legacy). */
  private async loadViolationFrame(v: Violation): Promise<Buffer | null> {
    try {
      if (v.frame_key) {
        const stream = await this.storage.streamObject(v.frame_key);
        if (!stream) return null;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(chunk as Buffer);
        return Buffer.concat(chunks);
      }
      if (v.frame_path && fs.existsSync(v.frame_path)) {
        return fs.readFileSync(v.frame_path);
      }
    } catch {
      // Foto hilang/corrupt — lampirkan tanpa foto, jangan gagalkan seluruh surat.
    }
    return null;
  }

  async generateLetter(
    spId: string,
    issuedByUsername: string,
  ): Promise<Buffer> {
    const sp = await this.spRepo.findOne({
      where: { id: spId },
      relations: { personnel: true },
    });
    if (!sp) throw new NotFoundException('SP tidak ditemukan');

    // Semua pelanggaran yang terhitung ke SP ini (sampai saat SP diterbitkan),
    // untuk dilampirkan sebagai bukti foto di halaman lampiran.
    const violations = await this.spRepo.manager
      .createQueryBuilder(Violation, 'v')
      .leftJoin('v.links', 'vl')
      .where('(v.personnel_id = :pid OR vl.personnel_id = :pid)', {
        pid: sp.personnel_id,
      })
      .andWhere('v.detected_at <= :issuedAt', { issuedAt: sp.issued_at })
      .orderBy('v.detected_at', 'ASC')
      .getMany();

    const violationEvidence = await Promise.all(
      violations.map(async (v) => ({
        violation: v,
        image: await this.loadViolationFrame(v),
      })),
    );

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
        const chunks: Buffer[] = [];
        const { PassThrough } = require('stream');
        const stream = new PassThrough();

        doc.pipe(stream);
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));

        // ── Header ──────────────────────────────────────────────────────────────
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .text('SURAT PERINGATAN', { align: 'center' });
        doc.fontSize(16).text(sp.level, { align: 'center' });
        doc.moveDown(0.5);

        // Garis horizontal
        doc
          .moveTo(72, doc.y)
          .lineTo(doc.page.width - 72, doc.y)
          .stroke();
        doc.moveDown(0.5);

        // ── Info SP ──────────────────────────────────────────────────────────────
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

        // ── Pembuka ──────────────────────────────────────────────────────────────
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

        // ── Isi surat ────────────────────────────────────────────────────────────
        doc
          .font('Helvetica')
          .fontSize(11)
          .text(
            `Bahwa berdasarkan hasil monitoring kepatuhan Alat Pelindung Diri (APD) ` +
              `menggunakan sistem SiMAPD, karyawan yang bersangkutan telah tercatat melakukan ` +
              `pelanggaran penggunaan APD sebanyak ${sp.violation_count_at_issuance} kali ` +
              `yang melebihi batas toleransi yang ditetapkan${
                violationEvidence.length > 0
                  ? ' (bukti foto terlampir pada halaman berikutnya)'
                  : ''
              }.`,
            { lineGap: 6, align: 'justify' },
          );
        doc.moveDown();
        doc.text(
          `Oleh karena itu, dengan ini diterbitkan ${sp.level} (${
            sp.level === 'SP1'
              ? 'Surat Peringatan Pertama'
              : sp.level === 'SP2'
                ? 'Surat Peringatan Kedua'
                : 'Surat Peringatan Ketiga'
          }) kepada karyawan tersebut. Surat Peringatan ini berlaku ` +
            `dari ${issuedAt} hingga ${expiresAt}.`,
          { lineGap: 6, align: 'justify' },
        );
        doc.moveDown();
        doc.text(
          'Diharapkan karyawan yang bersangkutan dapat segera memperbaiki perilaku ' +
            'dan mematuhi seluruh peraturan keselamatan kerja yang berlaku.',
          { lineGap: 6, align: 'justify' },
        );
        doc.moveDown(2);

        // ── Tanda tangan ─────────────────────────────────────────────────────────
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

        // ── Lampiran: bukti foto pelanggaran ────────────────────────────────────
        if (violationEvidence.length > 0) {
          doc.addPage();
          doc
            .font('Helvetica-Bold')
            .fontSize(13)
            .text('LAMPIRAN: BUKTI PELANGGARAN', { align: 'center' });
          doc.moveDown(1);

          const margin   = 72;
          const cols     = 2;
          const gap      = 16;
          const cellW    = (doc.page.width - margin * 2 - gap * (cols - 1)) / cols;
          const imgH     = cellW * 0.62;
          const captionH = 42;
          const cellH    = imgH + captionH;

          let col  = 0;
          let rowY = doc.y;

          violationEvidence.forEach(({ violation: v, image }, idx) => {
            if (col === 0) {
              if (rowY + cellH > doc.page.height - margin) {
                doc.addPage();
                rowY = doc.y;
              }
            }

            const x = margin + col * (cellW + gap);
            const y = rowY;

            doc.rect(x, y, cellW, imgH).stroke('#cccccc');
            if (image) {
              try {
                doc.image(image, x, y, { fit: [cellW, imgH], align: 'center', valign: 'center' });
              } catch {
                doc
                  .fontSize(8)
                  .fillColor('#999999')
                  .text('Gagal memuat foto', x + 4, y + imgH / 2 - 4, {
                    width: cellW - 8,
                    align: 'center',
                  })
                  .fillColor('black');
              }
            } else {
              doc
                .fontSize(8)
                .fillColor('#999999')
                .text('Foto tidak tersedia', x + 4, y + imgH / 2 - 4, {
                  width: cellW - 8,
                  align: 'center',
                })
                .fillColor('black');
            }

            const missing = [
              v.missing_helm  ? 'Helm'   : null,
              v.missing_vest  ? 'Vest'   : null,
              v.missing_shoes ? 'Sepatu' : null,
            ].filter(Boolean).join(', ') || '-';
            const detectedAt = new Date(v.detected_at).toLocaleString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            doc
              .font('Helvetica-Bold')
              .fontSize(8)
              .text(`#${idx + 1}  ${v.violation_code}`, x, y + imgH + 4, { width: cellW });
            doc
              .font('Helvetica')
              .fontSize(7)
              .text(`${detectedAt} · Kamera ${v.camera_id}`, x, y + imgH + 16, { width: cellW })
              .text(`Kurang APD: ${missing}`, x, y + imgH + 27, { width: cellW });

            if (col === cols - 1) {
              col  = 0;
              rowY = y + cellH + gap;
            } else {
              col = 1;
            }
          });
        }

        doc.end();
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err: any) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }

  async sendLetterByEmail(
    spId: string,
    issuedByUsername: string,
  ): Promise<{ message: string }> {
    const sp = await this.spRepo.findOne({
      where: { id: spId },
      relations: { personnel: true },
    });
    if (!sp) throw new NotFoundException('SP tidak ditemukan');
    if (!sp.personnel?.email) {
      throw new BadRequestException(
        'Karyawan ini belum memiliki alamat email',
      );
    }

    const pdf = await this.generateLetter(spId, issuedByUsername);
    const issuedAt = new Date(sp.issued_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    await this.mail.sendMail({
      to: sp.personnel.email,
      subject: `Surat Peringatan ${sp.level} — ${sp.sp_number}`,
      text:
        `Yth. ${sp.personnel.full_name},\n\n` +
        `Terlampir Surat Peringatan ${sp.level} (${sp.sp_number}) yang diterbitkan ` +
        `pada ${issuedAt} berdasarkan hasil monitoring kepatuhan APD sistem SiMAPD.\n\n` +
        `Mohon segera meninjau dan mematuhi seluruh peraturan keselamatan kerja yang berlaku.\n\n` +
        `Hormat kami,\n${issuedByUsername}\nSafety Officer`,
      attachments: [
        {
          filename: `${sp.sp_number.replace(/\//g, '-')}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });

    return { message: `Surat peringatan berhasil dikirim ke ${sp.personnel.email}` };
  }
}
