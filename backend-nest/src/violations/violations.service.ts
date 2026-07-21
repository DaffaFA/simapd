import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  constructor(
    @InjectRepository(Violation) private repo: Repository<Violation>,
    @InjectRepository(ViolationLink) private linkRepo: Repository<ViolationLink>,
    private spService: SpService,
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

  private async generateCode(date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    
    const count = await this.repo.createQueryBuilder('v')
      .where('v.detected_at BETWEEN :s AND :e', { s: start, e: end })
      .getCount();
      
    return `VL-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  async createFromDetection(dto: CreateViolationInternalDto): Promise<Violation> {
    const at = dto.detected_at ?? new Date();
    return this.repo.save(this.repo.create({
      ...dto,
      violation_code: await this.generateCode(at),
      detected_at: at,
      shift: ViolationsService.computeShift(at),
    }));
  }

  async findAll(filter: ViolationFilterDto): Promise<[Violation[], number]> {
    const qb = this.repo.createQueryBuilder('v').leftJoinAndSelect('v.personnel', 'p');
    
    if (filter.date_from) qb.andWhere('v.detected_at >= :df', { df: new Date(filter.date_from) });
    if (filter.date_to) qb.andWhere('v.detected_at <= :dt', { dt: new Date(filter.date_to) });
    if (filter.shift) qb.andWhere('v.shift = :sh', { sh: filter.shift });
    if (filter.camera_id) qb.andWhere('v.camera_id = :cam', { cam: filter.camera_id });
    if (filter.missing_ppe === 'helm') qb.andWhere('v.missing_helm = true');
    if (filter.missing_ppe === 'vest') qb.andWhere('v.missing_vest = true');
    if (filter.missing_ppe === 'sepatu') qb.andWhere('v.missing_shoes = true');
    if (filter.is_linked === true) qb.andWhere('v.personnel_id IS NOT NULL');
    if (filter.is_linked === false) qb.andWhere('v.personnel_id IS NULL');
    
    if (filter.personnel_id) {
      qb.innerJoin('v.links', 'link', 'link.personnel_id = :pid', { pid: filter.personnel_id });
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

  toResponseDto(v: Violation): ViolationResponseDto {
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
      frame_path: v.frame_key ?? v.frame_path ?? null, // Fallback ke frame_path jika frame_key gak ada
      personnel_id: v.personnel_id ?? null,
      personnel_name: v.personnel?.full_name ?? null,
      linked_at: v.linked_at ?? null,
    };
  }
}
