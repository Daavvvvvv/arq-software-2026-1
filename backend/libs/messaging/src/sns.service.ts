import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

@Injectable()
export class SnsService {
  private readonly client: SNSClient;
  private readonly logger = new Logger(SnsService.name);

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>('AWS_ENDPOINT');
    this.client = new SNSClient({
      region: config.get<string>('AWS_REGION') ?? 'us-east-1',
      ...(endpoint ? { endpoint } : {}),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') ?? 'test',
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') ?? 'test',
      },
    });
  }

  async publish(topicArn: string, message: Record<string, unknown>): Promise<string | undefined> {
    const cmd = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
    });
    try {
      const result = await this.client.send(cmd);
      this.logger.debug(`Published to ${topicArn}: ${result.MessageId}`);
      return result.MessageId;
    } catch (err) {
      this.logger.error(`Failed to publish to ${topicArn}`, err);
      throw err;
    }
  }
}
