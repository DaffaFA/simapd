import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { SpConfig } from '../sp/entities/sp-config.entity';
import { Camera } from '../stream/entities/camera.entity';
import { Personnel } from '../personnel/entities/personnel.entity';
export declare class SeedService implements OnApplicationBootstrap {
    private userRepository;
    private spConfigRepository;
    private cameraRepository;
    private personnelRepository;
    private readonly logger;
    constructor(userRepository: Repository<User>, spConfigRepository: Repository<SpConfig>, cameraRepository: Repository<Camera>, personnelRepository: Repository<Personnel>);
    onApplicationBootstrap(): Promise<void>;
}
