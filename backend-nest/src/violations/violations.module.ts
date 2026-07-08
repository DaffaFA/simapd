import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Violation } from './entities/violation.entity';
import { ViolationsService } from './violations.service';
import { ViolationsController } from './violations.controller';
import { SpModule } from '../sp/sp.module';

@Module({
  imports: [TypeOrmModule.forFeature([Violation]), SpModule],
  controllers: [ViolationsController],
  providers: [ViolationsService],
  exports: [ViolationsService],
})
export class ViolationsModule {}
