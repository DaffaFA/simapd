import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personnel } from './entities/personnel.entity';
import { SpService } from '../sp/sp.service';
import { Violation } from '../violations/entities/violation.entity';
import { PersonnelFilterDto } from './dto/personnel-filter.dto';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { PersonnelResponseDto } from './dto/personnel-response.dto';

@Injectable()
export class PersonnelService {
  constructor(
    @InjectRepository(Personnel) private repo: Repository<Personnel>,
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

  private async toDto(p: Personnel): Promise<PersonnelResponseDto> {
    try {
      await this.spService.checkAndAutoIssueSp(p.id, 'System');
    } catch (e) {
      console.error(`Auto SP check failed for personnel ${p.id}:`, e);
    }
    const [vCount, activeSp] = await Promise.all([
      this.spService.countViolationsForPersonnel(p.id),
      this.spService.getActiveSp(p.id),
    ]);
    return { ...p, violation_count: vCount, active_sp: activeSp?.level ?? null };
  }
}
