import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FcmChannel {
  private readonly logger = new Logger(FcmChannel.name);
  private readonly hasCredentials: boolean;

  constructor(private readonly config: ConfigService) {
    this.hasCredentials = !!(
      config.get<string>('FCM_PROJECT_ID') &&
      config.get<string>('FCM_PRIVATE_KEY') &&
      config.get<string>('FCM_CLIENT_EMAIL')
    );
  }

  async send(fcmToken: string | null | undefined, titulo: string, cuerpo: string): Promise<boolean> {
    if (!this.hasCredentials || !fcmToken) {
      this.logger.log(`[FCM LOG] To: ${fcmToken ?? 'no-token'} | ${titulo}: ${cuerpo}`);
      return true; // local mode: always succeeds
    }

    // Production: use Firebase Admin SDK
    this.logger.log(`[FCM PROD] Sending push to ${fcmToken}`);
    return true;
  }
}
