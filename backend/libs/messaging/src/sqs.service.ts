import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';

export type MessageHandler = (body: Record<string, unknown>, message: Message) => Promise<void>;

@Injectable()
export class SqsService implements OnApplicationShutdown {
  private readonly client: SQSClient;
  private readonly logger = new Logger(SqsService.name);
  private running = false;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>('AWS_ENDPOINT');
    this.client = new SQSClient({
      region: config.get<string>('AWS_REGION') ?? 'us-east-1',
      ...(endpoint ? { endpoint } : {}),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') ?? 'test',
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') ?? 'test',
      },
    });
  }

  startPolling(queueUrl: string, handler: MessageHandler): void {
    this.running = true;
    void this.poll(queueUrl, handler);
  }

  private async poll(queueUrl: string, handler: MessageHandler): Promise<void> {
    while (this.running) {
      try {
        const result = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
          }),
        );

        for (const msg of result.Messages ?? []) {
          try {
            let body = JSON.parse(msg.Body ?? '{}') as Record<string, unknown>;
            // SNS wraps the message in a Message field
            if (body['Message'] && typeof body['Message'] === 'string') {
              body = JSON.parse(body['Message']) as Record<string, unknown>;
            }
            await handler(body, msg);
            await this.deleteMessage(queueUrl, msg.ReceiptHandle!);
          } catch (err) {
            this.logger.error(`Error processing message ${msg.MessageId}`, err);
            // Do not delete — let SQS retry up to maxReceiveCount then DLQ
          }
        }
      } catch (err) {
        if (this.running) {
          this.logger.error('SQS polling error', err);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
  }

  private async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }),
    );
  }

  onApplicationShutdown(): void {
    this.running = false;
  }
}
