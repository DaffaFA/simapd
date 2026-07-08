import { Module } from '@nestjs/common';
import { SpService } from './sp.service';
import { SpController } from './sp.controller';

@Module({
  controllers: [SpController],
  providers: [SpService],
})
export class SpModule {}
