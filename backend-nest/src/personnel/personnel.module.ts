import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Personnel } from './entities/personnel.entity';
import { Violation } from '../violations/entities/violation.entity';
import { PersonnelService } from './personnel.service';
import { PersonnelController } from './personnel.controller';
import { SpModule } from '../sp/sp.module';

@Module({
  imports: [TypeOrmModule.forFeature([Personnel, Violation]), SpModule],
  controllers: [PersonnelController],
  providers: [PersonnelService],
})
export class PersonnelModule {}
