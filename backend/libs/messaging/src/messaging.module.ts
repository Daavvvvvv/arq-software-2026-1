import { Module, Global } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQService, CONCERT_EXCHANGE } from './rabbitmq.service';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('RABBITMQ_URL') ?? 'amqp://user:password@localhost:5672',
        exchanges: [
          {
            name: CONCERT_EXCHANGE,
            type: 'topic',
            options: { durable: true },
          },
        ],
        queues: [
          {
            name: 'payment-queue',
            options: { durable: true },
            exchange: CONCERT_EXCHANGE,
            routingKey: 'order.validated',
          },
          {
            name: 'kitchen-queue',
            options: { durable: true },
            exchange: CONCERT_EXCHANGE,
            routingKey: 'payment.confirmed',
          },
          {
            name: 'delivery-queue',
            options: { durable: true },
            exchange: CONCERT_EXCHANGE,
            routingKey: 'order.ready',
          },
          {
            name: 'notification-queue',
            options: { durable: true },
            bindQueueArguments: {
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': 'dlq-monitor-queue',
            },
          },
          {
            name: 'dlq-monitor-queue',
            options: { durable: true },
          },
        ],
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  providers: [RabbitMQService],
  exports: [RabbitMQService, RabbitMQModule],
})
export class MessagingModule {}
