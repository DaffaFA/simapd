import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Camera } from './entities/camera.entity';
import { DetectionStat } from '../analytics/entities/detection-stat.entity';
import { ViolationsModule } from '../violations/violations.module';
import { StreamGateway } from './stream.gateway';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Camera, DetectionStat]),
    ViolationsModule,
    // JwtModule perlu di-re-register di sini untuk StreamGateway
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({ secret: cfg.get('jwt.secret') }),
    }),
  ],
  providers: [
    // forwardRef diperlukan karena saling referensi sesuai instruksi
    { provide: StreamGateway, useClass: StreamGateway },
    { provide: StreamService, useClass: StreamService },
  ],
  controllers: [StreamController],
  exports: [StreamGateway],
})
export class StreamModule {}
