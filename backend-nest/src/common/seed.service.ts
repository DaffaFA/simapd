import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../auth/entities/user.entity';
import { SpConfig } from '../sp/entities/sp-config.entity';
import { Camera } from '../stream/entities/camera.entity';
import { Personnel } from '../personnel/entities/personnel.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(SpConfig) private spConfigRepository: Repository<SpConfig>,
    @InjectRepository(Camera) private cameraRepository: Repository<Camera>,
    @InjectRepository(Personnel) private personnelRepository: Repository<Personnel>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking database for seed data...');

    // 1. Seed User
    const userCount = await this.userRepository.count();
    if (userCount === 0) {
      this.logger.log('Seeding Users...');
      const adminHashed = await bcrypt.hash('admin123', 10);
      const officerHashed = await bcrypt.hash('officer123', 10);

      await this.userRepository.save([
        {
          username: 'admin',
          email: 'admin@simapd.local',
          hashed_password: adminHashed,
          full_name: 'Administrator',
          role: 'admin',
        },
        {
          username: 'officer1',
          email: 'officer1@simapd.local',
          hashed_password: officerHashed,
          full_name: 'Safety Officer 1',
          role: 'safety_officer',
        },
      ]);
    }

    // 2. Seed SpConfig
    const spConfigCount = await this.spConfigRepository.count();
    if (spConfigCount === 0) {
      this.logger.log('Seeding SpConfig...');
      await this.spConfigRepository.save({
        sp1_threshold: 3,
        sp2_threshold: 7,
        sp3_threshold: 12,
        sp1_duration_days: 30,
        sp2_duration_days: 60,
        sp3_duration_days: 90,
      });
    }

    // 3. Seed Camera
    const cameraCount = await this.cameraRepository.count();
    if (cameraCount === 0) {
      this.logger.log('Seeding Cameras...');
      await this.cameraRepository.save([
        {
          camera_id: 'CAM-01',
          name: 'Camera 01',
          zone: 'Zona A',
          rtsp_url: 'rtsp://mock-cam-01',
        },
        {
          camera_id: 'CAM-02',
          name: 'Camera 02',
          zone: 'Zona B',
          rtsp_url: 'rtsp://mock-cam-02',
        },
      ]);
    }

    // 4. Seed Personnel
    const personnelCount = await this.personnelRepository.count();
    if (personnelCount === 0) {
      this.logger.log('Seeding Personnel...');
      await this.personnelRepository.save([
        {
          employee_id: 'P-001',
          full_name: 'Budi Santoso',
          role: 'Pekerja',
          helm_color: 'Kuning',
          department: 'Operasional',
          email: 'budi.santoso@simapd.local',
        },
        {
          employee_id: 'S-001',
          full_name: 'Joko Widodo',
          role: 'Supervisor',
          helm_color: 'Putih',
          department: 'Manajemen',
          email: 'joko.widodo@simapd.local',
        },
        {
          employee_id: 'SO-001',
          full_name: 'Daffa Dziban Fadia',
          role: 'Safety Officer',
          helm_color: 'Hijau',
          department: 'HSE',
          email: 'daffa.10522911@mahasiswa.unikom.ac.id',
        },
      ]);
    }

    this.logger.log('Seeding complete.');
  }
}
