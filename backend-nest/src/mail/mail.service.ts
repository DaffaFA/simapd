import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly cfg: ConfigService) {
    this.from = this.cfg.get('SMTP_FROM') ?? 'SiMAPD <no-reply@simapd.local>';

    const host = this.cfg.get('SMTP_HOST');
    if (!host) {
      this.logger.warn(
        'SMTP_HOST tidak diset — pengiriman email dinonaktifkan',
      );
      this.transporter = null;
      return;
    }

    const user = this.cfg.get('SMTP_USER');
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.cfg.get('SMTP_PORT') ?? 587),
      secure: this.cfg.get('SMTP_SECURE') === 'true',
      auth: user
        ? { user, pass: this.cfg.get('SMTP_PASSWORD') }
        : undefined,
    });
  }

  async sendMail(opts: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error(
        'Email service tidak dikonfigurasi (set SMTP_HOST di environment)',
      );
    }
    await this.transporter.sendMail({ from: this.from, ...opts });
  }
}
