import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Violation } from './entities/violation.entity';
import { ViolationLink } from './entities/violation-link.entity';
import { ViolationsService } from './violations.service';
import { ViolationsController } from './violations.controller';
import { ViolationsScheduler } from './violations.scheduler';
import { SpModule } from '../sp/sp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Violation, ViolationLink]),
    SpModule,
  ],
  controllers: [ViolationsController],
  providers: [ViolationsService, ViolationsScheduler],
  exports: [ViolationsService],
})
export class ViolationsModule {}
