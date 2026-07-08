import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Violation } from '../violations/entities/violation.entity';
import { SpRecord } from '../sp/entities/sp-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Violation, SpRecord])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
