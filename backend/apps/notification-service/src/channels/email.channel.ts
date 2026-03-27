import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, subject: string, text: string): Promise<boolean> {
    try {
      // Ethereal for local dev — creates disposable test account
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await transporter.sendMail({
        from: '"Concert Orders" <noreply@concert.local>',
        to,
        subject,
        text,
      });

      this.logger.log(`[Email] Sent to ${to} — Preview: ${nodemailer.getTestMessageUrl(info)}`);
      return true;
    } catch (err) {
      this.logger.error(`[Email] Failed to send to ${to}`, err);
      return false;
    }
  }
}
