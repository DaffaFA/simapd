import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationsService.name);
  public app: App | null = null; // Exposed public for controller

  constructor(private readonly cfg: ConfigService) {}

  onApplicationBootstrap() {
    const keyPath = this.cfg.get('FIREBASE_SERVICE_ACCOUNT_PATH') ?? './firebase-service-account.json';
    try {
      const serviceAccount = require('../../' + keyPath); // Assuming it's in root
      this.app = initializeApp({
        credential: cert(serviceAccount),
      });
      this.logger.log('Firebase Admin initialized');
    } catch (e: any) {
      this.logger.warn(`Firebase Admin gagal init: ${e.message}`);
      this.logger.warn('Push notifications tidak aktif. Set FIREBASE_SERVICE_ACCOUNT_PATH.');
    }
  }

  async sendViolationNotification(payload: {
    camera_id:   string;
    count:       number;
    missing_ppe: string[];
  }): Promise<void> {
    if (!this.app) return;

    const ppeText = payload.missing_ppe
      .map(p => p === 'helm' ? 'Helm' : p === 'vest' ? 'Rompi' : 'Sepatu')
      .join(', ');

    try {
      await getMessaging(this.app).send({
        topic: 'simapd-violations',
        notification: {
          title: `⚠️ Pelanggaran APD — ${payload.camera_id}`,
          body:  `${payload.count} pelanggaran terdeteksi: ${ppeText}`,
        },
        webpush: {
          notification: {
            icon:  '/icon-192.png',
            badge: '/badge-72.png',
            tag:   'violation-batch',
          },
          fcmOptions: { link: '/violations' },
        },
        data: {
          camera_id: payload.camera_id,
          count:     String(payload.count),
        },
      });
      this.logger.debug(`FCM sent: ${payload.camera_id} ${payload.count} violations`);
    } catch (e: any) {
      this.logger.warn(`FCM send failed: ${e.message}`);
    }
  }
}
