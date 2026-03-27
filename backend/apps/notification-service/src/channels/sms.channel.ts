import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);

  async send(phone: string | null | undefined, message: string): Promise<void> {
    this.logger.warn(`[SMS STUB] To: ${phone ?? 'no-phone'} | ${message}`);
  }
}
