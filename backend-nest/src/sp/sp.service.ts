import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
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
    const records = await this.spRepo.find({ where: { personnel_id: personnelId, is_active: true } });
    const active = records.filter(r => r.expires_at > now);
    if (!active.length) return null;
    const order: Record<string, number> = { SP3: 3, SP2: 2, SP1: 1 };
    return active.sort((a, b) => order[b.level] - order[a.level])[0];
  }

  async checkAndAutoIssueSp(personnelId: string, issuedBy: string, triggerViolationId?: string): Promise<SpRecord | null> {
    const [config, violationCount, currentSp] = await Promise.all([
      this.getConfig(),
      this.spRepo.manager.count(Violation, { where: { personnel_id: personnelId } }),
      this.getActiveSp(personnelId),
    ]);
    const required = this.computeRequiredLevel(violationCount, config);
    if (!required) return null;
    const order: Record<string, number> = { SP1: 1, SP2: 2, SP3: 3 };
    if (currentSp && order[currentSp.level] >= order[required]) return currentSp;

    if (currentSp) {
      currentSp.is_active = false;
      await this.spRepo.save(currentSp);
    }

    const durKey = `sp${required.toLowerCase()}_duration_days` as keyof SpConfig;
    const durationDays = config[durKey] as number;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const personnel = await this.spRepo.manager.findOne(Personnel, { where: { id: personnelId } });
    const spCount = await this.spRepo.count({ where: { personnel_id: personnelId } });

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

  private computeRequiredLevel(count: number, cfg: SpConfig): 'SP1' | 'SP2' | 'SP3' | null {
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
    const violationCount = await this.spRepo.manager.count(Violation, { where: { personnel_id: dto.personnel_id } });
    
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
    if (!cfg) throw new InternalServerErrorException('SP config tidak ditemukan');
    return cfg;
  }

  async updateConfig(dto: SpConfigUpdateDto, updatedBy: string): Promise<SpConfig> {
    const cfg = await this.getConfig();
    Object.assign(cfg, dto);
    cfg.updated_by = updatedBy;
    return this.cfgRepo.save(cfg);
  }

  async findActiveAll(page: number, pageSize: number): Promise<[SpRecord[], number]> {
    return this.spRepo.findAndCount({
      where: { is_active: true },
      relations: { personnel: true },
      order: { issued_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async expireOutdated(): Promise<number> {
    const result = await this.spRepo.createQueryBuilder()
      .update(SpRecord)
      .set({ is_active: false })
      .where('is_active = true AND expires_at < NOW()')
      .execute();
    return result.affected ?? 0;
  }
}
