import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpRecord } from './entities/sp-record.entity';
import { SpConfig } from './entities/sp-config.entity';
import { User } from '../auth/entities/user.entity';
import { SpService } from './sp.service';
import { SpController } from './sp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpRecord, SpConfig, User])],
  controllers: [SpController],
  providers: [SpService],
  exports: [SpService],
})
export class SpModule {}
