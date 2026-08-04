import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { getMessaging } from 'firebase-admin/messaging';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(@Body('token') token: string) {
    if (!this.notifService.app) return { ok: false, error: 'Firebase not initialized' };
    try {
      await getMessaging(this.notifService.app)
        .subscribeToTopic([token], 'simapd-violations');
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
}
