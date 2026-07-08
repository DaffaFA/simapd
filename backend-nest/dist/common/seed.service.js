"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("../auth/entities/user.entity");
const sp_config_entity_1 = require("../sp/entities/sp-config.entity");
const camera_entity_1 = require("../stream/entities/camera.entity");
const personnel_entity_1 = require("../personnel/entities/personnel.entity");
let SeedService = SeedService_1 = class SeedService {
    constructor(userRepository, spConfigRepository, cameraRepository, personnelRepository) {
        this.userRepository = userRepository;
        this.spConfigRepository = spConfigRepository;
        this.cameraRepository = cameraRepository;
        this.personnelRepository = personnelRepository;
        this.logger = new common_1.Logger(SeedService_1.name);
    }
    async onApplicationBootstrap() {
        this.logger.log('Checking database for seed data...');
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
                },
                {
                    employee_id: 'S-001',
                    full_name: 'Joko Widodo',
                    role: 'Supervisor',
                    helm_color: 'Putih',
                    department: 'Manajemen',
                },
                {
                    employee_id: 'SO-001',
                    full_name: 'Andi Maulana',
                    role: 'Safety Officer',
                    helm_color: 'Hijau',
                    department: 'HSE',
                },
            ]);
        }
        this.logger.log('Seeding complete.');
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(sp_config_entity_1.SpConfig)),
    __param(2, (0, typeorm_1.InjectRepository)(camera_entity_1.Camera)),
    __param(3, (0, typeorm_1.InjectRepository)(personnel_entity_1.Personnel)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SeedService);
//# sourceMappingURL=seed.service.js.map