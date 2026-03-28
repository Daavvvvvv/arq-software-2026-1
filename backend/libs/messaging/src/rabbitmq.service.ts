import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { eventsPublishedTotal } from '@concert/telemetry';

export const CONCERT_EXCHANGE = 'concert-orders';

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  async publish(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.amqp.publish(CONCERT_EXCHANGE, routingKey, payload);
      eventsPublishedTotal.inc({ routing_key: routingKey });
      this.logger.debug(`Published [${routingKey}]: ${JSON.stringify(payload).slice(0, 80)}`);
    } catch (err) {
      this.logger.error(`Failed to publish [${routingKey}]`, err);
      throw err;
    }
  }
}
