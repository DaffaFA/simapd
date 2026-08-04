import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Violation } from './entities/violation.entity';
import { ViolationLink } from './entities/violation-link.entity';
import { SpService } from '../sp/sp.service';
import { CreateViolationInternalDto } from './dto/create-violation-internal.dto';
import { ViolationFilterDto } from './dto/violation-filter.dto';
import { LinkViolationDto } from './dto/link-violation.dto';
import { ViolationResponseDto } from './dto/violation-response.dto';

@Injectable()
export class ViolationsService {
  private readonly logger = new Logger(ViolationsService.name);

  constructor(
    @InjectRepository(Violation) private repo: Repository<Violation>,
    @InjectRepository(ViolationLink) private linkRepo: Repository<ViolationLink>,
    private spService: SpService,
    private cfg: ConfigService,
  ) {}

  static computeShift(date: Date): 'Pagi' | 'Siang' | 'Malam' {
    const h = date.getHours();
    if (h >= 7 && h < 15) return 'Pagi';
    if (h >= 15 && h < 23) return 'Siang';
    return 'Malam';
  }

  static buildMissingList(v: Partial<Violation>): string[] {
    return [
      v.missing_helm && 'helm',
      v.missing_vest && 'vest',
      v.missing_shoes && 'sepatu',
    ].filter(Boolean) as string[];
  }

  private generateCode(rawTimestamp?: string | Date): string {
    let date: Date;
    try {
      date = rawTimestamp ? new Date(rawTimestamp) : new Date();
      if (isNaN(date.getTime())) {
        this.logger.warn(
          `Invalid timestamp received: "${rawTimestamp}" — fallback ke Date.now()`
        );
        date = new Date();
      }
    } catch {
      date = new Date();
    }

    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `VL-${dateStr}-${sequence}`;
  }

  async createFromDetection(dto: CreateViolationInternalDto): Promise<Violation> {
    let at: Date;
    try {
      at = dto.detected_at ? new Date(dto.detected_at) : new Date();
      if (isNaN(at.getTime())) {
        this.logger.warn(`Invalid timestamp received: "${dto.detected_at}" — fallback ke Date.now()`);
        at = new Date();
      }
    } catch {
      at = new Date();
    }

    return this.repo.save(this.repo.create({
      ...dto,
      violation_code: this.generateCode(dto.detected_at as any),
      detected_at: at,
      shift: ViolationsService.computeShift(at),
    }));
  }

  async findAll(filter: ViolationFilterDto): Promise<[Violation[], number]> {
    const qb = this.repo.createQueryBuilder('v')
      .leftJoinAndSelect('v.personnel', 'p')
      .leftJoinAndSelect('v.links', 'links')
      .leftJoinAndSelect('links.personnel', 'linkPersonnel');

    if (filter.date_from) qb.andWhere('v.detected_at >= :df', { df: new Date(filter.date_from) });
    if (filter.date_to) qb.andWhere('v.detected_at <= :dt', { dt: new Date(filter.date_to) });
    if (filter.shift) qb.andWhere('v.shift = :sh', { sh: filter.shift });
    if (filter.camera_id) qb.andWhere('v.camera_id = :cam', { cam: filter.camera_id });
    if (filter.missing_ppe === 'helm') qb.andWhere('v.missing_helm = true');
    if (filter.missing_ppe === 'vest') qb.andWhere('v.missing_vest = true');
    if (filter.missing_ppe === 'sepatu') qb.andWhere('v.missing_shoes = true');
    if (filter.is_linked === true) qb.andWhere('v.personnel_id IS NOT NULL');
    if (filter.is_linked === false) qb.andWhere('v.personnel_id IS NULL');

    // Status filters
    if (filter.exclude_status) {
      qb.andWhere('v.status != :exc', { exc: filter.exclude_status });
    }
    if (filter.status) {
      qb.andWhere('v.status = :status', { status: filter.status });
    }

    if (filter.personnel_id) {
      qb.innerJoin('v.links', 'filterLink', 'filterLink.personnel_id = :pid', { pid: filter.personnel_id });
    }

    const p = filter.page ?? 1;
    const ps = filter.page_size ?? 20;

    return qb.orderBy('v.detected_at', 'DESC')
      .skip((p - 1) * ps)
      .take(ps)
      .getManyAndCount();
  }

  async findOne(id: string): Promise<Violation> {
    const v = await this.repo.findOne({ 
      where: { id }, 
      relations: { links: { personnel: true } }
    });
    if (!v) throw new NotFoundException();
    return v;
  }

  async linkToPersonnel(
    violationId: string,
    dto: LinkViolationDto,
    linkedBy: string,
  ): Promise<ViolationLink[]> {
    const violation = await this.findOne(violationId);
    if (!violation) throw new NotFoundException('Violation tidak ditemukan');

    if (!violation.personnel_id && dto.personnel_ids.length > 0) {
      violation.personnel_id = dto.personnel_ids[0];
      violation.linked_by = linkedBy;
      violation.linked_at = new Date();
      await this.repo.save(violation);
    }

    const createdLinks: ViolationLink[] = [];
    const errors: string[] = [];

    for (const personnelId of dto.personnel_ids) {
      // Cek apakah link sudah ada
      const existing = await this.linkRepo.findOne({
        where: { violation_id: violationId, personnel_id: personnelId }
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

      // Trigger SP check untuk setiap personnel yang di-link
      try {
        await this.spService.checkAndAutoIssueSp(personnelId, linkedBy, violationId);
      } catch (e) {
        console.error(`SP check failed untuk personnel ${personnelId}:`, e);
      }
    }

    if (errors.length > 0 && createdLinks.length === 0) {
      throw new ConflictException(errors.join('; '));
    }

    return createdLinks;
  }

  async unlinkFromPersonnel(
    violationId: string,
    personnelId: string,
  ): Promise<void> {
    const link = await this.linkRepo.findOne({
      where: { violation_id: violationId, personnel_id: personnelId }
    });
    if (!link) throw new NotFoundException('Link tidak ditemukan');
    await this.linkRepo.remove(link);

    const violation = await this.findOne(violationId);
    if (violation && violation.personnel_id === personnelId) {
      const remainingLinks = await this.linkRepo.find({ where: { violation_id: violationId } });
      (violation as any).personnel_id = remainingLinks.length > 0 ? remainingLinks[0].personnel_id : null;
      await this.repo.save(violation);
    }
  }

  async getLinksForViolation(violationId: string): Promise<ViolationLink[]> {
    return this.linkRepo.find({
      where: { violation_id: violationId },
      relations: { personnel: true },
      order: { linked_at: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    const v = await this.findOne(id);
    await this.repo.remove(v);
  }

  async rejectViolation(
    id:         string,
    rejectedBy: string,
    reason?:    string,
  ): Promise<Violation> {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Violation tidak ditemukan');
    if (v.status === 'rejected') throw new ConflictException('Sudah di-reject');

    v.status        = 'rejected';
    v.rejected_by   = rejectedBy;
    v.rejected_at   = new Date();
    v.reject_reason = reason ?? null;
    return this.repo.save(v);
  }

  async confirmViolation(id: string, confirmedBy: string): Promise<Violation> {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Violation tidak ditemukan');
    if (v.status === 'rejected') throw new ConflictException('Violation sudah di-reject');

    v.status = 'confirmed';
    return this.repo.save(v);
  }

  async autoRejectExpired(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);  // 2 hari yang lalu

    const result = await this.repo
      .createQueryBuilder()
      .update(Violation)
      .set({
        status:        'rejected',
        rejected_by:   'system',
        rejected_at:   new Date(),
        reject_reason: 'Auto-reject: tidak dikonfirmasi dalam 2 hari',
      })
      .where('status = :status', { status: 'pending' })
      .andWhere('created_at < :cutoff', { cutoff })
      .execute();

    return result.affected ?? 0;
  }

  toResponseDto(v: Violation): ViolationResponseDto {
    // Build unsigned URL for frame_key so frontend can use it directly as <img src>
    const frameKey = v.frame_key ?? null;
    let frameUrl: string | null = null;
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
      missing_ppe_list: ViolationsService.buildMissingList(v),
      confidence: v.confidence,
      bbox: [v.bbox_x1, v.bbox_y1, v.bbox_x2, v.bbox_y2],
      frame_path: frameUrl,
      frame_key: v.frame_key ?? null,
      personnel_id: v.personnel_id ?? null,
      personnel_name: v.personnel?.full_name ?? null,
      linked_at: v.linked_at ?? null,
      // Status lifecycle
      status: v.status ?? 'pending',
      rejected_by: v.rejected_by ?? null,
      rejected_at: v.rejected_at ?? null,
      reject_reason: v.reject_reason ?? null,
      links: (v.links ?? []).map(l => ({
        personnel_id: l.personnel_id,
        personnel: l.personnel ? { full_name: l.personnel.full_name } : undefined,
      })),
    };
  }
}
