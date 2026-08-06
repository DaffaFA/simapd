import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpRecord } from './entities/sp-record.entity';
import { SpConfig } from './entities/sp-config.entity';
import { Violation } from '../violations/entities/violation.entity';
import { Personnel } from '../personnel/entities/personnel.entity';
import { IssueSpDto } from './dto/issue-sp.dto';
import { SpConfigUpdateDto } from './dto/sp-config-update.dto';

@Injectable()
export class SpService {
  constructor(
    @InjectRepository(SpRecord) private spRepo: Repository<SpRecord>,
    @InjectRepository(SpConfig) private cfgRepo: Repository<SpConfig>,
  ) {}

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

  async generateLetter(
    spId: string,
    issuedByUsername: string,
  ): Promise<Buffer> {
    const sp = await this.spRepo.findOne({
      where: { id: spId },
      relations: { personnel: true },
    });
    if (!sp) throw new NotFoundException('SP tidak ditemukan');

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
              `yang melebihi batas toleransi yang ditetapkan.`,
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

        doc.end();
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err: any) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }
}
