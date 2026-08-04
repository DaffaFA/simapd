import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ViolationsService } from './violations.service';

@Injectable()
export class ViolationsScheduler {
  private readonly logger = new Logger(ViolationsScheduler.name);

  constructor(private readonly violationsService: ViolationsService) {}

  // Jalankan setiap tengah malam
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoReject() {
    const count = await this.violationsService.autoRejectExpired();
    if (count > 0) {
      this.logger.log(`Auto-reject: ${count} violation > 2 hari di-reject otomatis`);
    }
  }
}
